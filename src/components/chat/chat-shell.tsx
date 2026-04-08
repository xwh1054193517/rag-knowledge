"use client";

import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";

import ChatInputBar from "@/components/chat/chat-input-bar";
import ChatMessage from "@/components/chat/chat-message";
import ChatSidebar from "@/components/chat/chat-sidebar";
import type {
  ChatMessageItem,
  ConversationItem,
} from "@/components/chat/types";
import { Button } from "@/components/ui/button";

interface ChatShellProps {
  userEmail: string;
}

interface ConversationListResponse {
  items: ConversationItem[];
  nextCursor: string | null;
}

interface ConversationDetailResponse {
  id: string;
  title: string;
  messages: UIMessage[];
}

const CHAT_TIMEOUT_MS = 120_000;
const PAGE_SIZE = 12;

const initialMessages: ChatMessageItem[] = [
  {
    id: "welcome-assistant",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "你好，我已经准备好作为你的 AI 助手。你可以直接提问，我会基于当前项目上下文继续协助你。",
      },
    ],
  } as UIMessage,
];

const sidebarMotion = {
  expanded: {
    width: 320,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
  },
  collapsed: {
    width: 88,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/**
 * 判断消息是否已经包含可展示内容。
 */
function hasRenderableContent(message: UIMessage | undefined): boolean {
  if (!message) {
    return false;
  }

  return message.parts.some((part) => {
    if (part.type === "text" || part.type === "reasoning") {
      return part.text.trim().length > 0;
    }

    return false;
  });
}

/**
 * 根据首条消息生成会话标题。
 */
function getConversationTitle(content: string): string {
  return content.length > 80 ? `${content.slice(0, 80)}...` : content;
}

/**
 * 聊天工作区外壳。
 */
export default function ChatShell({ userEmail }: ChatShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [sendingCycle, setSendingCycle] = useState(0);
  const [isStopPending, setIsStopPending] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [timeoutMessage, setTimeoutMessage] = useState<UIMessage | null>(null);
  const [isConversationHydrating, setIsConversationHydrating] = useState(true);
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chatScrollEndRef = useRef<HTMLDivElement | null>(null);
  const previousConversationIdRef = useRef(activeConversationId);
  const previousMessageCountRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const activeConversationIdRef = useRef(activeConversationId);
  const didInitializeRef = useRef(false);
  const previousHydratingRef = useRef(isConversationHydrating);

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/runChat",
      credentials: "include",
    }),
  });
  const previousStatusRef = useRef(status);

  const hasMoreConversations = nextCursor !== null;
  const displayMessages = useMemo(() => {
    const baseMessages =
      messages.length > 0
        ? messages
        : activeConversationId
          ? []
          : initialMessages;

    return timeoutMessage ? [...baseMessages, timeoutMessage] : baseMessages;
  }, [activeConversationId, messages, timeoutMessage]);
  const isSending = status === "submitted" || status === "streaming";
  const showSendingRipple = isSending && !isStopPending;
  const lastMessage = messages.at(-1);
  const showThinkingProcess =
    isSending &&
    (!lastMessage ||
      lastMessage.role !== "assistant" ||
      !hasRenderableContent(lastMessage));

  /**
   * 拉取单个会话详情。
   */
  const loadConversationDetail = useCallback(
    async (conversationId: string) => {
      setIsConversationHydrating(true);

      try {
        const response = await fetch(`/api/chats/${conversationId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load chat detail.");
        }

        const data = (await response.json()) as ConversationDetailResponse;

        setMessages(data.messages);
        setTimeoutMessage(null);
      } catch (error) {
        console.error(error);
        setMessages([]);
      } finally {
        setIsConversationHydrating(false);
      }
    },
    [setMessages]
  );

  /**
   * 拉取会话列表，可选择是否同步刷新当前会话内容。
   */
  const loadConversations = useCallback(
    async (reset: boolean, hydrateActiveConversation = true) => {
      const cursor = reset ? null : nextCursor;

      if (!reset && (!cursor || isLoadingMore)) {
        return;
      }

      if (!reset) {
        setIsLoadingMore(true);
      }

      try {
        const searchParams = new URLSearchParams({
          limit: String(PAGE_SIZE),
        });

        if (cursor) {
          searchParams.set("cursor", cursor);
        }

        const response = await fetch(`/api/chats?${searchParams.toString()}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load conversations.");
        }

        const data = (await response.json()) as ConversationListResponse;

        setConversations((current) =>
          reset ? data.items : [...current, ...data.items]
        );
        setNextCursor(data.nextCursor);

        if (!reset) {
          return;
        }

        const nextActiveId =
          activeConversationIdRef.current &&
          data.items.some(
            (conversation) =>
              conversation.id === activeConversationIdRef.current
          )
            ? activeConversationIdRef.current
            : (data.items[0]?.id ?? "");

        setActiveConversationId(nextActiveId);

        if (!nextActiveId) {
          setMessages([]);
          setIsConversationHydrating(false);
          return;
        }

        if (!hydrateActiveConversation) {
          return;
        }

        await loadConversationDetail(nextActiveId);
      } catch (error) {
        console.error(error);
        if (reset) {
          setIsConversationHydrating(false);
        }
      } finally {
        setIsLoadingMore(false);
      }
    },
    [isLoadingMore, loadConversationDetail, nextCursor, setMessages]
  );

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (didInitializeRef.current) {
      return;
    }

    didInitializeRef.current = true;
    void loadConversations(true);
  }, [loadConversations]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    const didFinishResponse =
      (previousStatus === "submitted" || previousStatus === "streaming") &&
      status === "ready";

    previousStatusRef.current = status;

    if (!didFinishResponse) {
      return;
    }

    void loadConversations(true, false);
  }, [loadConversations, status]);

  useEffect(() => {
    const scrollElement = chatScrollContainerRef.current;
    const scrollEndElement = chatScrollEndRef.current;

    if (!scrollElement || !scrollEndElement) {
      return;
    }

    const isConversationChanged =
      previousConversationIdRef.current !== activeConversationId;
    const isMessageCountChanged =
      previousMessageCountRef.current !== displayMessages.length;
    const isNearBottom =
      scrollElement.scrollHeight -
        scrollElement.scrollTop -
        scrollElement.clientHeight <
      96;

    if (isConversationChanged || (isMessageCountChanged && isNearBottom)) {
      scrollEndElement.scrollIntoView({
        block: "end",
        behavior: isConversationChanged ? "smooth" : "auto",
      });
    }

    previousConversationIdRef.current = activeConversationId;
    previousMessageCountRef.current = displayMessages.length;
  }, [activeConversationId, displayMessages.length]);

  useEffect(() => {
    const didFinishHydrating =
      previousHydratingRef.current && !isConversationHydrating;

    previousHydratingRef.current = isConversationHydrating;

    if (!didFinishHydrating) {
      return;
    }

    chatScrollEndRef.current?.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
  }, [activeConversationId, isConversationHydrating]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    if (!isSending) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      stop();
      setTimeoutMessage({
        id: `timeout-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "本次回答超过 120 秒仍未完成，已自动停止。你可以缩小问题范围后重试，或者重新发起一次对话。",
          },
        ],
      } as UIMessage);
    }, CHAT_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isSending, stop]);

  /**
   * 创建新的会话记录。
   */
  async function createConversationRecord(title: string) {
    const response = await fetch("/api/chats", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: getConversationTitle(title),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create chat.");
    }

    const conversation = (await response.json()) as ConversationItem;

    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);

    return conversation.id;
  }

  /**
   * 切换侧边栏收缩状态。
   */
  function handleToggleSidebarCollapse() {
    setIsSidebarCollapsed((current) => !current);
  }

  /**
   * 新建本地空白会话。
   */
  function handleCreateConversation() {
    setActiveConversationId("");
    setMessages([]);
    setTimeoutMessage(null);
    setIsMobileSidebarOpen(false);
    setIsConversationHydrating(false);
  }

  /**
   * 删除指定会话。
   */
  async function handleDeleteConversation(conversationId: string) {
    const response = await fetch(`/api/chats/${conversationId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return;
    }

    const nextConversations = conversations.filter(
      (conversation) => conversation.id !== conversationId
    );

    setConversations(nextConversations);

    if (conversationId !== activeConversationId) {
      return;
    }

    const nextConversationId = nextConversations[0]?.id ?? "";

    setActiveConversationId(nextConversationId);
    if (nextConversationId) {
      await loadConversationDetail(nextConversationId);
    } else {
      setMessages([]);
      setTimeoutMessage(null);
    }
  }

  /**
   * 切换当前查看的会话。
   */
  async function handleSelectConversation(conversationId: string) {
    if (conversationId === activeConversationId) {
      setIsMobileSidebarOpen(false);
      return;
    }

    setActiveConversationId(conversationId);
    setIsMobileSidebarOpen(false);
    await loadConversationDetail(conversationId);
  }

  /**
   * 提交用户输入消息。
   */
  async function handleSendMessage(value: string) {
    setIsStopPending(false);
    setTimeoutMessage(null);
    setSendingCycle((current) => current + 1);
    setInputValue("");

    const conversationId =
      activeConversationId || (await createConversationRecord(value));

    await sendMessage(
      {
        text: value,
      },
      {
        body: {
          conversationId,
        },
      }
    );
  }

  /**
   * 中止当前正在生成的回复。
   */
  function handleStopMessage() {
    setIsStopPending(true);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    stop();
  }

  /**
   * 滚动到底部时继续加载更多会话。
   */
  function handleLoadMoreConversations() {
    void loadConversations(false);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <motion.aside
        animate={isSidebarCollapsed ? "collapsed" : "expanded"}
        variants={sidebarMotion}
        className="relative hidden h-screen shrink-0 overflow-hidden border-r border-[var(--ui-border-soft)] bg-[linear-gradient(180deg,var(--ui-surface),color-mix(in_srgb,var(--ui-surface-muted)_86%,transparent))] px-2 py-5 pr-1 shadow-[18px_0_50px_var(--ui-shadow)] md:flex md:flex-col"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--ui-ambient-1),transparent_34%),radial-gradient(circle_at_bottom,var(--ui-ambient-2),transparent_28%)]" />
        <ChatSidebar
          activeConversationId={activeConversationId}
          conversations={conversations}
          hasMore={hasMoreConversations}
          isCollapsed={isSidebarCollapsed}
          isLoadingMore={isLoadingMore}
          onCreateConversation={handleCreateConversation}
          onDeleteConversation={handleDeleteConversation}
          onLoadMore={handleLoadMoreConversations}
          onSelectConversation={handleSelectConversation}
          onToggleCollapse={handleToggleSidebarCollapse}
          showMobileClose={false}
          userEmail={userEmail}
        />
      </motion.aside>

      <AnimatePresence>
        {isMobileSidebarOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[var(--ui-backdrop)] backdrop-blur-[2px] md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <motion.aside
              initial={{ x: -24, opacity: 0.96 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex h-full w-[86vw] max-w-[22rem] flex-col overflow-hidden border-r border-[var(--ui-border-soft)] bg-[linear-gradient(180deg,var(--ui-surface),color-mix(in_srgb,var(--ui-surface-muted)_88%,transparent))] px-3 py-5 shadow-[18px_0_50px_var(--ui-shadow)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--ui-ambient-1),transparent_34%),radial-gradient(circle_at_bottom,var(--ui-ambient-2),transparent_28%)]" />
              <ChatSidebar
                activeConversationId={activeConversationId}
                conversations={conversations}
                hasMore={hasMoreConversations}
                isCollapsed={false}
                isLoadingMore={isLoadingMore}
                onCloseMobile={() => setIsMobileSidebarOpen(false)}
                onCreateConversation={handleCreateConversation}
                onDeleteConversation={handleDeleteConversation}
                onLoadMore={handleLoadMoreConversations}
                onSelectConversation={handleSelectConversation}
                onToggleCollapse={handleToggleSidebarCollapse}
                showMobileClose
                userEmail={userEmail}
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="relative flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--ui-ambient-1),transparent_24%),radial-gradient(circle_at_82%_18%,var(--ui-ambient-2),transparent_20%),linear-gradient(180deg,var(--ui-bg-soft),var(--ui-bg))]" />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-[color:rgba(255,255,255,0.08)] px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-5 dark:border-[var(--ui-border-soft)]">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="h-10 w-10 rounded-2xl border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.06)] p-0 text-[var(--ui-accent)] hover:bg-[var(--ui-surface)] md:hidden dark:bg-[var(--ui-surface)]"
                >
                  <Menu className="size-4" />
                </Button>

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--ui-text-faint)]">
                    Current Chat
                  </p>
                </div>
              </div>
            </div>
          </header>

          <section className="grid min-h-0 w-full flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden pb-4 pt-6">
            <ChatMessage
              isLoadingConversation={isConversationHydrating}
              messages={isConversationHydrating ? [] : displayMessages}
              isThinking={showThinkingProcess}
              scrollContainerRef={chatScrollContainerRef}
              scrollEndRef={chatScrollEndRef}
            />
            <ChatInputBar
              inputValue={inputValue}
              isSending={isSending}
              showSendingRipple={showSendingRipple}
              sendingCycle={sendingCycle}
              onInputChange={setInputValue}
              onSend={handleSendMessage}
              onStop={handleStopMessage}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
