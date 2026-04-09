"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { UIMessage } from "ai";
import { Bot, PencilLine, RotateCcw, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message?: UIMessage;
  isThinking?: boolean;
  isFailure?: boolean;
  failureText?: string;
  canEdit?: boolean;
  canRetry?: boolean;
  editingValue?: string;
  isActionDisabled?: boolean;
  isEditing?: boolean;
  onEditCancel?: () => void;
  onEditChange?: (value: string) => void;
  onEditSend?: () => void;
  onRetry?: () => void;
  onStartEdit?: () => void;
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
        </div>
      </div>
    </div>
  );
}

/**
 * 渲染失败提示气泡。
 */
function renderFailureBubble(failureText: string) {
  return (
    <div className="flex w-full justify-start gap-3">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[var(--ui-border-soft)] bg-[linear-gradient(180deg,var(--ui-surface),var(--ui-surface-muted))] text-[var(--ui-accent-strong)] shadow-[0_12px_28px_var(--ui-shadow)]">
        <Bot className="size-4" />
      </div>

      <div className="max-w-[min(78ch,78%)]">
        <div className="rounded-2xl border border-[var(--ui-border-soft)] bg-[color:rgba(255,255,255,0.38)] px-4 py-3 text-sm leading-6 text-[var(--ui-text)] shadow-[0_12px_24px_var(--ui-shadow)] dark:bg-[color:rgba(255,255,255,0.03)]">
          {failureText}
        </div>
      </div>
    </div>
  );
}

/**
 * 单条对话气泡。
 */
function MessageBubble({
  message,
  isThinking = false,
  isFailure = false,
  failureText = "请求失败，可重试",
  canEdit = false,
  canRetry = false,
  editingValue = "",
  isActionDisabled = false,
  isEditing = false,
  onEditCancel,
  onEditChange,
  onEditSend,
  onRetry,
  onStartEdit,
}: MessageBubbleProps) {
  if (isThinking) {
    return renderThinkingBubble();
  }

  if (isFailure) {
    return renderFailureBubble(failureText);
  }

  if (!message) {
    return null;
  }

  const isUserMessage = message.role === "user";
  const messageText = getMessageText(message);
  const reasoningText = getReasoningText(message);

  if (!messageText && !reasoningText && !isEditing) {
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

        {isEditing ? (
          <div className="min-w-[min(50ch,50vw)] rounded-[1.5rem] border border-[var(--ui-border)] p-3 shadow-[0_16px_34px_var(--ui-shadow)]">
            <Textarea
              value={editingValue}
              onChange={(event) => onEditChange?.(event.target.value)}
              autoFocus
              className="min-h-14 resize-none border-0 bg-transparent px-0 py-0 text-[15px] leading-7  shadow-none outline-none placeholder:text-white/45 focus-visible:ring-0"
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onEditCancel}
                className="h-9 rounded-xl border-white/10  px-3 text-sm"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onEditSend}
                disabled={editingValue.trim().length === 0 || isActionDisabled}
                className="h-9 rounded-xl border border-white/10  px-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </Button>
            </div>
          </div>
        ) : messageText ? (
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

        {isUserMessage && (canRetry || canEdit) && !isEditing ? (
          <div className="flex items-center justify-end gap-2 pr-1">
            <button
              type="button"
              onClick={onRetry}
              disabled={isActionDisabled}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-[var(--ui-text-faint)] transition hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onStartEdit}
              disabled={isActionDisabled}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-[var(--ui-text-faint)] transition hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PencilLine className="size-3.5" />
            </button>
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
