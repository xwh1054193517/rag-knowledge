"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SendHorizonal, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";

interface ChatInputBarProps {
  inputValue: string;
  isSending: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

/**
 * 聊天输入条组件。
 */
export default function ChatInputBar({
  inputValue,
  isSending,
  onInputChange,
  onSend,
}: ChatInputBarProps) {
  const canSendMessage = inputValue.trim().length > 0 && !isSending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="mb-4 mt-4 shrink-0 px-4 sm:mb-5 sm:px-6"
    >
      <div className="mx-auto max-w-5xl rounded-[1.3rem] border border-[#f0e5df] bg-white/84 px-2.5 py-2 shadow-[0_18px_60px_rgba(195,162,149,0.08)]">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[1rem] px-1 py-0.5">
            <div className="rounded-xl bg-[#fbf3ef] p-1.5 text-[#b18479]">
              <Sparkles className="size-3.5" />
            </div>
            <Input
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canSendMessage) {
                  event.preventDefault();
                  onSend();
                }
              }}
              placeholder="How can I help you today?"
              className="h-8 border-0 bg-transparent px-0 text-[14px] text-[#6f5c55] shadow-none placeholder:text-[#b7a39b] focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <motion.button
            type="button"
            onClick={onSend}
            disabled={!canSendMessage}
            whileTap={{ scale: 0.97 }}
            className={
              isSending
                ? "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] border border-[#d8c3bb] bg-[#8a665c] text-[#fff7f3] shadow-[0_10px_24px_rgba(138,102,92,0.28)] transition"
                : "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] border border-[#eaded8] bg-[linear-gradient(135deg,#f7efea,#f1e5de)] text-[#7a625a] shadow-[0_10px_24px_rgba(179,147,136,0.14)] transition hover:bg-[linear-gradient(135deg,#faf4ef,#f4e9e2)] disabled:cursor-not-allowed disabled:opacity-55"
            }
            aria-label="发送消息"
          >
            <AnimatePresence>
              {isSending ? (
                <>
                  <motion.span
                    key="ripple-1"
                    initial={{ scale: 0.25, opacity: 0.5 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute inset-0 m-auto h-7 w-7 rounded-full bg-[#d8beb5]/65"
                  />
                  <motion.span
                    key="ripple-2"
                    initial={{ scale: 0.25, opacity: 0.42 }}
                    animate={{ scale: 2.4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1.2,
                      ease: "easeOut",
                      delay: 0.22,
                    }}
                    className="absolute inset-0 m-auto h-7 w-7 rounded-full bg-[#edd7cf]/70"
                  />
                </>
              ) : null}
            </AnimatePresence>

            <span className="relative z-10">
              {isSending ? (
                <span className="block h-3 w-3 rounded-[0.2rem] bg-[#fff7f3]" />
              ) : (
                <SendHorizonal className="size-4" />
              )}
            </span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
