"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";

import ChatHistory from "@/components/chat/chat-history";
import ChatInputBar from "@/components/chat/chat-input-bar";
import ChatSidebar from "@/components/chat/chat-sidebar";
import type { ConversationItem, PreviewMessage } from "@/components/chat/types";
import { Button } from "@/components/ui/button";

interface ChatShellProps {
  userEmail: string;
}

const allConversations: ConversationItem[] = [
  {
    id: "conv-1",
    title: "产品需求拆解",
    preview: "整理 AI Agent 对话应用的核心功能与开发顺序。",
    dateGroup: "今天",
    sortOrder: 0,
    updatedAt: "刚刚",
  },
  {
    id: "conv-2",
    title: "知识库检索策略",
    preview: "设计用户私有文档与公开文档混合召回逻辑。",
    dateGroup: "今天",
    sortOrder: 1,
    updatedAt: "10 分钟前",
  },
  {
    id: "conv-3",
    title: "流式消息设计",
    preview: "梳理 Vercel AI SDK 的消息结构与前端渲染方式。",
    dateGroup: "今天",
    sortOrder: 2,
    updatedAt: "35 分钟前",
  },
  {
    id: "conv-4",
    title: "Supabase 路由守卫实现",
    preview: "设计系统与 AI 模型名称解析、鉴权和页面跳转策略。",
    dateGroup: "昨天",
    sortOrder: 3,
    updatedAt: "昨天 22:16",
  },
  {
    id: "conv-5",
    title: "会话表结构调整",
    preview: "统一 UUID 主键和 auth.users 对齐方式。",
    dateGroup: "昨天",
    sortOrder: 4,
    updatedAt: "昨天 18:40",
  },
  {
    id: "conv-6",
    title: "RAG 检索召回策略",
    preview: "区分私有知识库与公开文档的混合召回顺序。",
    dateGroup: "昨天",
    sortOrder: 5,
    updatedAt: "昨天 14:25",
  },
  {
    id: "conv-7",
    title: "聊天输入体验优化",
    preview: "统一单行输入、发送态按钮与加载反馈。",
    dateGroup: "更早",
    sortOrder: 6,
    updatedAt: "4 月 5 日",
  },
  {
    id: "conv-8",
    title: "消息存储模型评估",
    preview: "确认消息、工具调用 JSON 和附件字段的设计。",
    dateGroup: "更早",
    sortOrder: 7,
    updatedAt: "4 月 4 日",
  },
  {
    id: "conv-9",
    title: "公开文档权限方案",
    preview: "整理可公开文档的搜索范围和访问限制。",
    dateGroup: "更早",
    sortOrder: 8,
    updatedAt: "4 月 3 日",
  },
];

const previewMessages: PreviewMessage[] = [
  {
    id: "msg-1",
    role: "assistant",
    content:
      "你好，我已经为你准备好了聊天工作区。接下来可以逐步接入真实会话、消息存储和知识库检索。",
  },
  {
    id: "msg-2",
    role: "user",
    content: "先把侧边栏和聊天区域 UI 搭起来，整体风格参考 ChatGPT。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "基础布局已经就绪。左侧支持收缩、会话列表、新增和删除入口，右侧保留了消息流与输入区的展示结构。",
  },
];

const sidebarMotion = {
  expanded: {
    width: 320,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
  },
  collapsed: {
    width: 88,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * 聊天工作区外壳，负责管理会话状态与整体布局。
 */
export default function ChatShell({ userEmail }: ChatShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [visibleConversationCount, setVisibleConversationCount] = useState(6);
  const [conversations, setConversations] =
    useState<ConversationItem[]>(allConversations);
  const [activeConversationId, setActiveConversationId] = useState(
    allConversations[0]?.id ?? ""
  );
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chatScrollEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId
      ) ??
      conversations[0] ??
      null,
    [activeConversationId, conversations]
  );
  const visibleConversations = useMemo(
    () => conversations.slice(0, visibleConversationCount),
    [conversations, visibleConversationCount]
  );
  const hasMoreConversations = visibleConversationCount < conversations.length;

  useEffect(() => {
    if (!isSending) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSending(false);
      setInputValue("");
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSending]);

  useEffect(() => {
    chatScrollEndRef.current?.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
  }, [activeConversationId]);

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

  /**
   * 切换侧边栏收缩状态。
   */
  function handleToggleSidebarCollapse() {
    setIsSidebarCollapsed((current) => !current);
  }

  /**
   * 创建一个新的本地预览会话。
   */
  function handleCreateConversation() {
    const newConversation: ConversationItem = {
      id: `conv-${Date.now()}`,
      title: "新对话",
      preview: "等待输入第一条消息。",
      dateGroup: "今天",
      sortOrder: -Date.now(),
      updatedAt: "刚刚",
    };

    setConversations((currentConversations) => [
      newConversation,
      ...currentConversations,
    ]);
    setVisibleConversationCount((currentCount) => currentCount + 1);
    setActiveConversationId(newConversation.id);
    setIsMobileSidebarOpen(false);
  }

  /**
   * 删除指定会话，并在需要时切换当前激活项。
   */
  function handleDeleteConversation(conversationId: string) {
    setConversations((currentConversations) => {
      const nextConversations = currentConversations.filter(
        (conversation) => conversation.id !== conversationId
      );

      if (conversationId === activeConversationId) {
        setActiveConversationId(nextConversations[0]?.id ?? "");
      }

      return nextConversations;
    });
  }

  /**
   * 选择当前查看的会话。
   */
  function handleSelectConversation(conversationId: string) {
    setActiveConversationId(conversationId);
    setIsMobileSidebarOpen(false);
  }

  /**
   * 模拟发送消息的加载态。
   */
  function handleSendMessage() {
    if (!inputValue.trim()) {
      return;
    }

    setIsSending(true);
  }

  /**
   * 会话列表滚动到底部时加载更多。
   */
  function handleLoadMoreConversations() {
    if (isLoadingMore || !hasMoreConversations) {
      return;
    }

    setIsLoadingMore(true);

    window.setTimeout(() => {
      setVisibleConversationCount((currentCount) =>
        Math.min(currentCount + 3, conversations.length)
      );
      setIsLoadingMore(false);
    }, 550);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#fcf7f4] text-[#5a4741]">
      <motion.aside
        animate={isSidebarCollapsed ? "collapsed" : "expanded"}
        variants={sidebarMotion}
        className="relative hidden h-screen shrink-0 overflow-hidden border-r border-[#f1e6e1] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(250,243,238,0.96))] px-2 py-5 shadow-[18px_0_50px_rgba(195,162,149,0.08)] md:flex md:flex-col pr-1"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(224,197,184,0.16),transparent_34%),radial-gradient(circle_at_bottom,rgba(244,229,221,0.14),transparent_28%)]" />
        <ChatSidebar
          activeConversationId={activeConversationId}
          conversations={visibleConversations}
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
            className="fixed inset-0 z-40 bg-[#6d5750]/20 backdrop-blur-[2px] md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <motion.aside
              initial={{ x: -24, opacity: 0.96 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex h-full w-[86vw] max-w-[22rem] flex-col overflow-hidden border-r border-[#f1e6e1] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(250,243,238,0.98))] px-3 py-5 shadow-[18px_0_50px_rgba(195,162,149,0.14)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(224,197,184,0.16),transparent_34%),radial-gradient(circle_at_bottom,rgba(244,229,221,0.14),transparent_28%)]" />
              <ChatSidebar
                activeConversationId={activeConversationId}
                conversations={visibleConversations}
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(224,197,184,0.18),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(244,229,221,0.14),transparent_20%),linear-gradient(180deg,rgba(255,250,247,0.94),rgba(249,241,236,0.9))]" />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-white/70 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-5">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="h-10 w-10 rounded-2xl border-[#eaded8] bg-white/84 p-0 text-[#b18479] hover:bg-white md:hidden"
                >
                  <Menu className="size-4" />
                </Button>

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#b39d95]">
                    Current Chat
                  </p>
                  <h1 className="mt-2 truncate text-xl font-semibold text-[#5a4741] sm:text-2xl">
                    {activeConversation?.title ?? "新的对话"}
                  </h1>
                </div>
              </div>
            </div>
          </header>

          <section className="grid min-h-0 w-full flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden pb-4 pt-6">
            <ChatHistory
              messages={previewMessages}
              scrollContainerRef={chatScrollContainerRef}
              scrollEndRef={chatScrollEndRef}
            />
            <ChatInputBar
              inputValue={inputValue}
              isSending={isSending}
              onInputChange={setInputValue}
              onSend={handleSendMessage}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
