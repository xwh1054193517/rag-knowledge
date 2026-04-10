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
  total: number;
}

interface ConversationDetailResponse {
  id: string;
  title: string;
  messages: UIMessage[];
}

// 超时时间
const CHAT_TIMEOUT_MS = 360_000;

// 会话查询limit
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

function hasAssistantRenderableContent(messages: UIMessage[]): boolean {
  return messages.some(
    (message) => message.role === "assistant" && hasRenderableContent(message)
  );
}

/**
 * 根据首条消息生成会话标题。
 */
function getConversationTitle(content: string): string {
  return content.length > 80 ? `${content.slice(0, 80)}...` : content;
}

/**
 * 提取 UIMessage 中的纯文本内容。
 */
function getUIMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

/**
 * 创建本地超时提示消息。
 */
function createTimeoutNotice(): UIMessage {
  return {
    id: `timeout-${Date.now()}`,
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "本次回答超过 120 秒仍未完成，已自动停止。你可以缩小问题范围后重试，或者重新发起一次对话。",
      },
    ],
  } as UIMessage;
}

/**
 * 用新内容覆盖最后一条用户消息，并删除它之后的消息。
 */
function replaceLastUserMessage(
  currentMessages: UIMessage[],
  content: string
): { nextMessages: UIMessage[]; targetMessageId: string | null } {
  const lastUserIndex = [...currentMessages]
    .map((message, index) => ({ message, index }))
    .reverse()
    .find(({ message }) => message.role === "user")?.index;

  if (lastUserIndex === undefined) {
    return {
      nextMessages: currentMessages,
      targetMessageId: null,
    };
  }

  const targetMessage = currentMessages[lastUserIndex];
  const nextMessages = currentMessages
    .slice(0, lastUserIndex + 1)
    .map((message, index) =>
      index === lastUserIndex
        ? {
            ...message,
            parts: [
              {
                type: "text" as const,
                text: content,
              },
            ],
          }
        : message
    );

  return {
    nextMessages,
    targetMessageId: targetMessage.id,
  };
}

/**
 * 聊天工作区外壳。
 */
export default function ChatShell({ userEmail }: ChatShellProps) {
  // 侧边栏收起状态
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 侧边栏会话到底加载更多
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // 第几次会话 用于重置动画
  const [sendingCycle, setSendingCycle] = useState(0);

  const [isStopPending, setIsStopPending] = useState(false);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [conversationMessages, setConversationMessages] = useState<UIMessage[]>(
    []
  );

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [timeoutMessage, setTimeoutMessage] = useState<UIMessage | null>(null);

  const [isConversationHydrating, setIsConversationHydrating] = useState(true);

  // 聊天区域滚动容器
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
  // 聊天区域滚动底部锚点
  const chatScrollEndRef = useRef<HTMLDivElement | null>(null);

  // 上一个对话 用于比对 执行滚到底部
  const previousConversationIdRef = useRef(activeConversationId);
  const previousMessageCountRef = useRef(0);

  const timeoutRef = useRef<number | null>(null);
  const activeConversationIdRef = useRef(activeConversationId);
  const detailRequestIdRef = useRef(0);
  const setMessagesRef = useRef<((messages: UIMessage[]) => void) | null>(null);
  const pendingRequestConversationIdRef = useRef<string | null>(null);
  const pendingRequestModeRef = useRef<"create" | "rerun-last-user" | null>(
    null
  );
  const streamOwnerConversationIdRef = useRef<string | null>(null);
  const didTimeoutRef = useRef(false);

  const didInitializeRef = useRef(false);
  const previousHydratingRef = useRef(isConversationHydrating);
  const loadConversationDetailRef = useRef<
    | ((
        conversationId: string,
        options?: { showLoading?: boolean }
      ) => Promise<void>)
    | null
  >(null);

  const [conversationTotal, setConversationTotal] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [failedRequestConversationId, setFailedRequestConversationId] =
    useState<string | null>(null);

  // 乐观thinking 不等接口
  const [optimisticMessage, setOptimisticMessage] = useState<UIMessage | null>(
    null
  );
  const [isOptimisticThinking, setIsOptimisticThinking] = useState(false);
  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/runChat",
        credentials: "include",
      }),
    []
  );

  const { messages, regenerate, sendMessage, setMessages, status, stop } =
    useChat({
      transport: chatTransport,
    });
  const previousStatusRef = useRef(status);
  const isStreamingForActiveConversation =
    !isConversationHydrating &&
    (!streamOwnerConversationIdRef.current ||
      streamOwnerConversationIdRef.current === activeConversationId);
  const visibleConversationMessages =
    isStreamingForActiveConversation && messages.length > 0
      ? messages
      : conversationMessages;

  const hasMoreConversations = nextCursor !== null;
  const displayMessages = useMemo(() => {
    const baseMessages =
      visibleConversationMessages.length > 0
        ? visibleConversationMessages
        : activeConversationId
          ? []
          : initialMessages;

    //先把乐观消息加上
    const mergedMessages = optimisticMessage
      ? [...baseMessages, optimisticMessage]
      : baseMessages;

    return timeoutMessage
      ? [...mergedMessages, timeoutMessage]
      : mergedMessages;
  }, [
    activeConversationId,
    visibleConversationMessages,
    optimisticMessage,
    timeoutMessage,
  ]);
  const isSending = status === "submitted" || status === "streaming";
  //只有在发送中且用户没有点停止时，发送按钮才显示扩散波纹。
  const showSendingRipple = isSending && !isStopPending;
  const lastMessage = visibleConversationMessages.at(-1);
  const lastUserMessage = useMemo(
    () =>
      [...visibleConversationMessages]
        .reverse()
        .find((message) => message.role === "user"),
    [visibleConversationMessages]
  );
  const isActionDisabled = isSending || isConversationHydrating;

  // 正在发送中并且最后一条消息还不是有内容的 assistant 回复
  // 也就是 AI 已经开始工作，但还没真正吐出可展示文本时，就先显示思考占位。
  const showThinkingProcess =
    isOptimisticThinking ||
    (isSending &&
      (!lastMessage ||
        lastMessage.role !== "assistant" ||
        !hasRenderableContent(lastMessage)));

  /**
   * 拉取单个会话详情。
   */
  const loadConversationDetail = useCallback(
    async (
      conversationId: string,
      options?: {
        showLoading?: boolean;
      }
    ) => {
      const shouldShowLoading = options?.showLoading ?? true;

      // 先让消息区进入切换 loading
      const requestId = ++detailRequestIdRef.current;
      if (shouldShowLoading) {
        setIsConversationHydrating(true);
      }

      try {
        const response = await fetch(`/api/chats/${conversationId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load chat detail.");
        }

        const data = (await response.json()) as ConversationDetailResponse;

        if (requestId !== detailRequestIdRef.current) {
          return;
        }

        setMessagesRef.current?.(data.messages);
        setConversationMessages(data.messages);
        setTimeoutMessage(null);
      } catch (error) {
        if (requestId !== detailRequestIdRef.current) {
          return;
        }

        console.error(error);
        setMessagesRef.current?.([]);
        setConversationMessages([]);
      } finally {
        if (requestId === detailRequestIdRef.current && shouldShowLoading) {
          setIsConversationHydrating(false);
        }
      }
    },
    []
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
        setConversationTotal(data.total);
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
            : "";

        setActiveConversationId(nextActiveId);

        if (!nextActiveId) {
          setMessages([]);
          setConversationMessages([]);
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
    setMessagesRef.current = setMessages;
  }, [setMessages]);

  useEffect(() => {
    loadConversationDetailRef.current = loadConversationDetail;
  }, [loadConversationDetail]);

  useEffect(() => {
    setEditingMessageId(null);
    setEditingValue("");
  }, [activeConversationId]);

  useEffect(() => {
    if (didInitializeRef.current) {
      return;
    }

    didInitializeRef.current = true;
    void loadConversations(true);
  }, [loadConversations]);

  useEffect(() => {
    // 上条对话的状态
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
    if (status === "submitted" || status === "streaming") {
      setOptimisticMessage(null);
      setIsOptimisticThinking(false);
      return;
    }

    if (status === "ready") {
      const didTimeout = didTimeoutRef.current;
      const pendingConversationId = pendingRequestConversationIdRef.current;

      setIsOptimisticThinking(false);
      setFailedRequestConversationId(null);
      streamOwnerConversationIdRef.current = null;
      pendingRequestConversationIdRef.current = null;
      pendingRequestModeRef.current = null;
      didTimeoutRef.current = false;

      if (didTimeout && pendingConversationId) {
        const timeoutNotice = createTimeoutNotice();

        void loadConversationDetailRef
          .current?.(pendingConversationId, {
            showLoading: false,
          })
          .then(() => {
            setTimeoutMessage(timeoutNotice);
          });
      }
    }
  }, [loadConversationDetail, status]);

  useEffect(() => {
    if (status !== "error" || !pendingRequestConversationIdRef.current) {
      return;
    }

    if (didTimeoutRef.current) {
      return;
    }

    const failedConversationId = pendingRequestConversationIdRef.current;
    const failedMode = pendingRequestModeRef.current;

    if (hasAssistantRenderableContent(messages)) {
      setIsOptimisticThinking(false);
      setFailedRequestConversationId(null);
      streamOwnerConversationIdRef.current = null;
      pendingRequestConversationIdRef.current = null;
      pendingRequestModeRef.current = null;
      return;
    }

    setIsOptimisticThinking(false);
    setFailedRequestConversationId(failedConversationId);
    streamOwnerConversationIdRef.current = null;

    if (failedMode === "create" || failedMode === "rerun-last-user") {
      void loadConversationDetailRef.current?.(failedConversationId, {
        showLoading: false,
      });
    }
  }, [loadConversationDetail, messages, status]);

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
    // 如果切换了会话，就平滑滚到底
    // 如果消息条数变了，并且用户本来就在接近底部的位置，也自动滚到底
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

  // 自动执行超时停止
  useEffect(() => {
    if (!isSending) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      didTimeoutRef.current = true;
      setFailedRequestConversationId(null);
      stop();
      setTimeoutMessage(createTimeoutNotice());
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
    detailRequestIdRef.current += 1;

    if (isSending) {
      setIsStopPending(true);
      stop();
    }

    setActiveConversationId("");
    setMessages([]);
    setConversationMessages([]);
    setTimeoutMessage(null);
    setFailedRequestConversationId(null);
    setEditingMessageId(null);
    setEditingValue("");
    setOptimisticMessage(null);
    setIsOptimisticThinking(false);
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

    detailRequestIdRef.current += 1;

    if (isSending) {
      setIsStopPending(true);
      stop();
    }

    const nextConversationId = nextConversations[0]?.id ?? "";

    setActiveConversationId(nextConversationId);
    if (nextConversationId) {
      setMessages([]);
      setConversationMessages([]);
      await loadConversationDetail(nextConversationId);
    } else {
      setMessages([]);
      setConversationMessages([]);
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

    detailRequestIdRef.current += 1;

    if (isSending) {
      setIsStopPending(true);
      stop();
    }

    setEditingMessageId(null);
    setEditingValue("");
    setFailedRequestConversationId(null);
    setOptimisticMessage(null);
    setIsOptimisticThinking(false);
    setMessages([]);
    setConversationMessages([]);
    setIsConversationHydrating(true);
    setActiveConversationId(conversationId);
    setIsMobileSidebarOpen(false);
    await loadConversationDetail(conversationId);
  }

  /**
   * 提交用户输入消息。
   */
  async function handleSendMessage(value: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return;
    }

    const optimisticUserMessage = {
      id: `optimistic-user-${Date.now()}`,
      role: "user",
      parts: [
        {
          type: "text",
          text: trimmedValue,
        },
      ],
    } as UIMessage;

    setIsStopPending(false);
    didTimeoutRef.current = false;
    setTimeoutMessage(null);
    setSendingCycle((current) => current + 1);
    setOptimisticMessage(optimisticUserMessage);
    setIsOptimisticThinking(true);
    setInputValue("");
    let resolvedConversationId: string | null = activeConversationId || null;

    try {
      resolvedConversationId =
        activeConversationId || (await createConversationRecord(trimmedValue));

      setFailedRequestConversationId(null);
      streamOwnerConversationIdRef.current = resolvedConversationId;
      pendingRequestConversationIdRef.current = resolvedConversationId;
      pendingRequestModeRef.current = "create";

      await sendMessage(
        {
          text: trimmedValue,
        },
        {
          body: {
            conversationId: resolvedConversationId,
          },
        }
      );
    } catch (error) {
      setOptimisticMessage(null);
      setIsOptimisticThinking(false);
      setInputValue(trimmedValue);
      if (resolvedConversationId) {
        await loadConversationDetail(resolvedConversationId, {
          showLoading: false,
        });
        setFailedRequestConversationId(resolvedConversationId);
      }
      throw error;
    }
  }

  /**
   * 对最后一条用户消息执行重新发送。
   */
  async function handleRetryLastUserMessage() {
    if (!activeConversationId || !lastUserMessage || isActionDisabled) {
      return;
    }

    const currentContent = getUIMessageText(lastUserMessage);
    const { nextMessages, targetMessageId } = replaceLastUserMessage(
      conversationMessages,
      currentContent
    );

    if (!targetMessageId) {
      return;
    }

    setFailedRequestConversationId(null);
    setEditingMessageId(null);
    setEditingValue("");
    didTimeoutRef.current = false;
    setTimeoutMessage(null);
    setSendingCycle((current) => current + 1);
    setIsStopPending(false);
    setIsOptimisticThinking(true);
    setMessages(nextMessages);
    setConversationMessages(nextMessages);
    streamOwnerConversationIdRef.current = activeConversationId;
    pendingRequestConversationIdRef.current = activeConversationId;
    pendingRequestModeRef.current = "rerun-last-user";

    try {
      await regenerate({
        messageId: targetMessageId,
        body: {
          conversationId: activeConversationId,
          mode: "rerun-last-user",
        },
      });
    } catch (error) {
      setIsOptimisticThinking(false);
      setFailedRequestConversationId(activeConversationId);
      throw error;
    }
  }

  /**
   * 进入最后一条用户消息的编辑态。
   */
  function handleStartEditLastUserMessage() {
    if (!lastUserMessage || isActionDisabled) {
      return;
    }

    setEditingMessageId(lastUserMessage.id);
    setEditingValue(getUIMessageText(lastUserMessage));
  }

  /**
   * 取消编辑最后一条用户消息。
   */
  function handleCancelEditLastUserMessage() {
    setEditingMessageId(null);
    setEditingValue("");
  }

  /**
   * 发送编辑后的最后一条用户消息。
   */
  async function handleSendEditedLastUserMessage() {
    const trimmedValue = editingValue.trim();

    if (
      !activeConversationId ||
      !lastUserMessage ||
      !trimmedValue ||
      isActionDisabled
    ) {
      return;
    }

    const { nextMessages, targetMessageId } = replaceLastUserMessage(
      conversationMessages,
      trimmedValue
    );

    if (!targetMessageId) {
      return;
    }

    setFailedRequestConversationId(null);
    setEditingMessageId(null);
    setEditingValue("");
    didTimeoutRef.current = false;
    setTimeoutMessage(null);
    setSendingCycle((current) => current + 1);
    setIsStopPending(false);
    setIsOptimisticThinking(true);
    setMessages(nextMessages);
    setConversationMessages(nextMessages);
    streamOwnerConversationIdRef.current = activeConversationId;
    pendingRequestConversationIdRef.current = activeConversationId;
    pendingRequestModeRef.current = "rerun-last-user";

    try {
      await regenerate({
        messageId: targetMessageId,
        body: {
          conversationId: activeConversationId,
          mode: "rerun-last-user",
        },
      });
    } catch (error) {
      setIsOptimisticThinking(false);
      setFailedRequestConversationId(activeConversationId);
      throw error;
    }
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
          conversationTotal={conversationTotal}
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
                conversationTotal={conversationTotal}
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
              editingMessageId={editingMessageId}
              editingValue={editingValue}
              failureConversationId={
                failedRequestConversationId === activeConversationId
                  ? failedRequestConversationId
                  : null
              }
              isActionDisabled={isActionDisabled}
              isLoadingConversation={isConversationHydrating}
              messages={isConversationHydrating ? [] : displayMessages}
              isThinking={showThinkingProcess}
              isStreamingResponse={isSending}
              lastUserMessageId={lastUserMessage?.id ?? null}
              onEditCancel={handleCancelEditLastUserMessage}
              onEditChange={setEditingValue}
              onEditSend={handleSendEditedLastUserMessage}
              onRetryLastUser={handleRetryLastUserMessage}
              onStartEdit={handleStartEditLastUserMessage}
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
