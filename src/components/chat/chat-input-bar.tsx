"use client";

import { motion } from "framer-motion";
import { SendHorizonal, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";

interface ChatInputBarProps {
  inputValue: string;
  isSending: boolean;
  showSendingRipple: boolean;
  sendingCycle: number;
  onInputChange: (value: string) => void;
  onSend: (value: string) => void;
  onStop: () => void;
}

/**
 * 聊天输入条。
 */
export default function ChatInputBar({
  inputValue,
  isSending,
  showSendingRipple,
  sendingCycle,
  onInputChange,
  onSend,
  onStop,
}: ChatInputBarProps) {
  const canSendMessage = inputValue.trim().length > 0;

  /**
   * 发送当前输入内容。
   */
  function handleSend() {
    const nextValue = inputValue.trim();

    if (!nextValue || isSending) {
      return;
    }

    onSend(nextValue);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="mb-4 mt-4 shrink-0 px-4 sm:mb-5 sm:px-6"
    >
      <div className="mx-auto max-w-5xl rounded-[1.3rem] border border-[var(--ui-border-soft)] bg-[color:rgba(255,255,255,0.06)] px-2.5 py-2 shadow-[0_18px_60px_var(--ui-shadow)] backdrop-blur-sm dark:bg-[var(--ui-surface)]">
        <div className="flex items-center gap-2 overflow-visible">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[1rem] px-1 py-0.5">
            <div className="rounded-xl bg-[var(--ui-surface-muted)] p-1.5 text-[var(--ui-accent)]">
              <Sparkles className="size-3.5" />
            </div>
            <Input
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canSendMessage && !isSending) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="How can I help you today?"
              className="h-8 border-0 bg-transparent px-0 text-[14px] text-[var(--ui-text)] shadow-none placeholder:text-[var(--ui-text-faint)] focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-visible">
            {showSendingRipple ? (
              <>
                <motion.span
                  key={`ripple-1-${sendingCycle}`}
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 2.4, opacity: 0 }}
                  transition={{
                    duration: 1.35,
                    ease: "easeOut",
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                  className="pointer-events-none absolute inset-0 rounded-full border-2 border-[color:rgba(134,161,199,0.42)]"
                />
                <motion.span
                  key={`glow-${sendingCycle}`}
                  initial={{ opacity: 0.18 }}
                  animate={{ opacity: [0.18, 0.36, 0.18] }}
                  transition={{
                    duration: 1.1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className="pointer-events-none absolute -inset-3 rounded-full bg-[radial-gradient(circle,color:rgba(163,190,225,0.22)_0%,rgba(163,190,225,0.08)_42%,transparent_72%)]"
                />
              </>
            ) : null}

            <motion.button
              type="button"
              onClick={isSending ? onStop : handleSend}
              disabled={!isSending && !canSendMessage}
              whileTap={{ scale: 0.97 }}
              className={
                isSending
                  ? "relative z-10 flex h-9 w-9 items-center justify-center rounded-[0.9rem] border border-[var(--ui-border-strong)] bg-[var(--ui-accent-strong)] text-[var(--ui-bg-soft)] shadow-[0_10px_24px_var(--ui-shadow)] transition"
                  : "relative z-10 flex h-9 w-9 items-center justify-center rounded-[0.9rem] border border-[var(--ui-border)] bg-[linear-gradient(135deg,var(--ui-surface),var(--ui-surface-muted))] text-[var(--ui-accent-strong)] shadow-[0_10px_24px_var(--ui-shadow)] transition hover:bg-[linear-gradient(135deg,var(--ui-bg-soft),var(--ui-surface-strong))] disabled:cursor-not-allowed disabled:opacity-55"
              }
              aria-label={isSending ? "停止生成" : "发送消息"}
            >
              {isSending ? (
                <span className="block h-3 w-3 rounded-[0.2rem] bg-[var(--ui-bg-soft)]" />
              ) : (
                <SendHorizonal className="size-4" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
