"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { UIMessage } from "ai";
import { Bot, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message?: UIMessage;
  isThinking?: boolean;
}

/**
 * 提取消息中的纯文本内容。
 */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/**
 * 提取消息中的推理内容。
 */
function getReasoningText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "reasoning")
    .map((part) => part.text)
    .join("");
}

/**
 * 渲染思考中的占位气泡。
 */
function renderThinkingBubble() {
  return (
    <div className="flex w-full justify-start gap-3">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[var(--ui-border-soft)] bg-[linear-gradient(180deg,var(--ui-surface),var(--ui-surface-muted))] text-[var(--ui-accent-strong)] shadow-[0_12px_28px_var(--ui-shadow)]">
        <Bot className="size-4" />
      </div>

      <div className="max-w-[min(78ch,78%)] space-y-2">
        <div className="rounded-2xl border border-[var(--ui-border-soft)] bg-[color:rgba(255,255,255,0.38)] px-4 py-3 text-sm leading-6 text-[var(--ui-text-muted)] shadow-[0_12px_24px_var(--ui-shadow)] dark:bg-[color:rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-2 text-[var(--ui-text)]">
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ui-text-faint)]">
              Thinking / Process
            </span>
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                  transition={{
                    duration: 1,
                    ease: "easeInOut",
                    repeat: Number.POSITIVE_INFINITY,
                    delay: index * 0.14,
                  }}
                  className="block h-1.5 w-1.5 rounded-full bg-[var(--ui-accent-strong)]"
                />
              ))}
            </div>
          </div>
          <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
            AI 正在整理上下文并准备回复。
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 单条对话气泡。
 */
function MessageBubble({ message, isThinking = false }: MessageBubbleProps) {
  if (isThinking) {
    return renderThinkingBubble();
  }

  if (!message) {
    return null;
  }

  const isUserMessage = message.role === "user";
  const messageText = getMessageText(message);
  const reasoningText = getReasoningText(message);

  if (!messageText && !reasoningText) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUserMessage ? "justify-end" : "justify-start"
      )}
    >
      {!isUserMessage ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[var(--ui-border-soft)] bg-[linear-gradient(180deg,var(--ui-surface),var(--ui-surface-muted))] text-[var(--ui-accent-strong)] shadow-[0_12px_28px_var(--ui-shadow)]">
          <Bot className="size-4" />
        </div>
      ) : null}

      <div
        className={cn(
          "max-w-[min(78ch,78%)] space-y-2",
          isUserMessage ? "items-end" : "items-start"
        )}
      >
        {reasoningText ? (
          <div className="rounded-2xl border border-[var(--ui-border-soft)] bg-[color:rgba(255,255,255,0.38)] px-4 py-3 text-sm leading-6 text-[var(--ui-text-muted)] shadow-[0_12px_24px_var(--ui-shadow)] dark:bg-[color:rgba(255,255,255,0.03)]">
            {reasoningText}
          </div>
        ) : null}

        {messageText ? (
          <div
            className={cn(
              "rounded-[1.5rem] px-4 py-3 text-[15px] leading-7 shadow-[0_16px_34px_var(--ui-shadow)]",
              isUserMessage
                ? "rounded-br-md border border-[var(--ui-border)] bg-[linear-gradient(135deg,var(--ui-accent),var(--ui-accent-strong))] text-white"
                : "rounded-bl-md border border-[var(--ui-border-soft)] bg-[linear-gradient(180deg,var(--ui-surface),var(--ui-surface-muted))] text-[var(--ui-text)]"
            )}
          >
            <p className="whitespace-pre-wrap break-words">{messageText}</p>
          </div>
        ) : null}
      </div>

      {isUserMessage ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[var(--ui-border-soft)] bg-[linear-gradient(180deg,var(--ui-surface),var(--ui-surface-muted))] text-[var(--ui-accent-strong)] shadow-[0_12px_28px_var(--ui-shadow)]">
          <UserRound className="size-4" />
        </div>
      ) : null}
    </div>
  );
}

export default memo(MessageBubble);
