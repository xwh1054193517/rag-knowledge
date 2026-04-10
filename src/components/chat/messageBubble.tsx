"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { UIMessage } from "ai";
import { Bot, Brain, PencilLine, RotateCcw, UserRound } from "lucide-react";

import RichMessageContent from "@/components/chat/rich-message-content";
import ToolBubble from "@/components/chat/tool-bubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message?: UIMessage;
  renderSignature?: string;
  isThinking?: boolean;
  isFailure?: boolean;
  failureText?: string;
  preferPlainText?: boolean;
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

interface NormalizedReasoningPart {
  key: string;
  text: string;
  isStreaming: boolean;
}

interface NormalizedToolPart {
  key: string;
  toolCallId: string;
  title: string;
  status: "running" | "success" | "error";
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

function getToolPartTitle(part: UIMessage["parts"][number]): string {
  if ("toolName" in part && typeof part.toolName === "string") {
    return part.toolName;
  }

  if ("title" in part && typeof part.title === "string") {
    return part.title;
  }

  return part.type.startsWith("tool-") ? part.type.slice(5) : "tool";
}

function getToolPartErrorText(part: UIMessage["parts"][number]): string {
  if ("error" in part) {
    return getToolContentText(part.error);
  }

  if ("errorText" in part && typeof part.errorText === "string") {
    return part.errorText;
  }

  return "Tool call failed";
}

/**
 * 閹绘劕褰囧☉鍫熶紖娑擃厾娈?reasoning 閻楀洦顔岄妴? */
function getReasoningParts(message: UIMessage): NormalizedReasoningPart[] {
  return message.parts.flatMap((part, index) => {
    if (part.type !== "reasoning" || part.text.trim().length === 0) {
      return [];
    }

    return [
      {
        key: `${message.id}-reasoning-${index}`,
        text: part.text,
        isStreaming: part.state === "streaming",
      },
    ];
  });
}

/**
 * 鐏忓棔绗夐崥灞借埌閹胶娈戝銉ュ徔濞戝牊浼呴悧鍥唽缂佺喍绔撮弫瀵告倞娑撳搫褰插〒鍙夌厠缂佹挻鐎妴? */
function getToolParts(message: UIMessage): NormalizedToolPart[] {
  const normalizedParts: NormalizedToolPart[] = [];

  message.parts.forEach((part, index) => {
    if (part.type === "tool-call") {
      normalizedParts.push({
        key: `${message.id}-tool-call-${part.toolCallId}-${index}`,
        toolCallId: part.toolCallId,
        title: getToolPartTitle(part),
        status: "running",
        input: part.input,
      });
      return;
    }

    if (part.type === "tool-result") {
      normalizedParts.push({
        key: `${message.id}-tool-result-${part.toolCallId}-${index}`,
        toolCallId: part.toolCallId,
        title: getToolPartTitle(part),
        status: "success",
        input: part.input,
        output: part.output,
      });
      return;
    }

    if (part.type === "tool-error") {
      normalizedParts.push({
        key: `${message.id}-tool-error-${part.toolCallId}-${index}`,
        toolCallId: part.toolCallId,
        title: getToolPartTitle(part),
        status: "error",
        input: part.input,
        errorText: getToolPartErrorText(part),
      });
      return;
    }

    if (part.type === "dynamic-tool") {
      if (part.state === "output-available") {
        normalizedParts.push({
          key: `${message.id}-dynamic-tool-${part.toolCallId}-${index}`,
          toolCallId: part.toolCallId,
          title: getToolPartTitle(part),
          status: "success",
          input: part.input,
          output: part.output,
        });
        return;
      }

      if (part.state === "output-error") {
        normalizedParts.push({
          key: `${message.id}-dynamic-tool-${part.toolCallId}-${index}`,
          toolCallId: part.toolCallId,
          title: getToolPartTitle(part),
          status: "error",
          input: part.input,
          errorText: part.errorText,
        });
        return;
      }

      normalizedParts.push({
        key: `${message.id}-dynamic-tool-${part.toolCallId}-${index}`,
        toolCallId: part.toolCallId,
        title: getToolPartTitle(part),
        status: "running",
        input: part.input,
      });
      return;
    }

    if (part.type.startsWith("tool-")) {
      const toolName = part.type.slice(5);
      const toolPart = part as {
        toolCallId?: string;
        state?: string;
        input?: unknown;
        output?: unknown;
        errorText?: string;
      };

      if (toolPart.state === "output-available") {
        normalizedParts.push({
          key: `${message.id}-${part.type}-${toolPart.toolCallId ?? index}`,
          toolCallId: toolPart.toolCallId ?? `${index}`,
          title: toolName,
          status: "success",
          input: toolPart.input,
          output: toolPart.output,
        });
        return;
      }

      if (toolPart.state === "output-error") {
        normalizedParts.push({
          key: `${message.id}-${part.type}-${toolPart.toolCallId ?? index}`,
          toolCallId: toolPart.toolCallId ?? `${index}`,
          title: toolName,
          status: "error",
          input: toolPart.input,
          errorText: toolPart.errorText,
        });
        return;
      }

      normalizedParts.push({
        key: `${message.id}-${part.type}-${toolPart.toolCallId ?? index}`,
        toolCallId: toolPart.toolCallId ?? `${index}`,
        title: toolName,
        status: "running",
        input: toolPart.input,
      });
    }
  });

  const toolPartsByCallId = new Map<string, NormalizedToolPart>();
  const statusPriority = {
    running: 1,
    success: 2,
    error: 3,
  } as const;

  for (const part of normalizedParts) {
    const existingPart = toolPartsByCallId.get(part.toolCallId);

    if (!existingPart) {
      toolPartsByCallId.set(part.toolCallId, part);
      continue;
    }

    const nextPart =
      statusPriority[part.status] >= statusPriority[existingPart.status]
        ? {
            ...existingPart,
            ...part,
            input: part.input ?? existingPart.input,
            output: part.output ?? existingPart.output,
            errorText: part.errorText ?? existingPart.errorText,
          }
        : {
            ...part,
            ...existingPart,
            input: existingPart.input ?? part.input,
            output: existingPart.output ?? part.output,
            errorText: existingPart.errorText ?? part.errorText,
          };

    toolPartsByCallId.set(part.toolCallId, nextPart);
  }

  return [...toolPartsByCallId.values()];
}

/**
 * 鐏忓棗浼愰崗鐤翻閸忋儴绶崙铏圭埠娑撯偓閺嶇厧绱￠崠鏍﹁礋鐎涙顑佹稉灞傗偓? */
function getToolContentText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? "");
  }
}

function getValueSignature(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return `s:${value.length}:${value.slice(0, 80)}`;
  }

  try {
    const serializedValue = JSON.stringify(value);
    return serializedValue
      ? `j:${serializedValue.length}:${serializedValue.slice(0, 80)}`
      : "";
  } catch {
    return String(value);
  }
}

function getMessageRenderSignature(message?: UIMessage): string {
  if (!message) {
    return "";
  }

  return `${message.id}:${message.role}:${message.parts
    .map((part) => {
      if (part.type === "text" || part.type === "reasoning") {
        return `${part.type}:${part.text.length}:${part.text.slice(0, 120)}`;
      }

      if (part.type === "tool-call" || part.type === "tool-result") {
        return `${part.type}:${part.toolCallId}:${getToolPartTitle(part)}:${getValueSignature(part.input)}:${"output" in part ? getValueSignature(part.output) : ""}`;
      }

      if (part.type === "tool-error") {
        return `${part.type}:${part.toolCallId}:${getToolPartTitle(part)}:${getValueSignature(part.input)}:${getToolPartErrorText(part)}`;
      }

      if (part.type === "dynamic-tool") {
        return `${part.type}:${part.toolCallId}:${getToolPartTitle(part)}:${part.state}:${getValueSignature(part.input)}:${"output" in part ? getValueSignature(part.output) : ""}:${"errorText" in part && typeof part.errorText === "string" ? part.errorText : ""}`;
      }

      if (part.type.startsWith("tool-")) {
        const toolPart = part as {
          toolCallId?: string;
          state?: string;
          input?: unknown;
          output?: unknown;
          errorText?: string;
        };

        return `${part.type}:${toolPart.toolCallId ?? ""}:${toolPart.state ?? ""}:${getValueSignature(toolPart.input)}:${getValueSignature(toolPart.output)}:${toolPart.errorText ?? ""}`;
      }

      return part.type;
    })
    .join("|")}`;
}
/**
 * 閹绘劕褰囧☉鍫熶紖娑擃厾娈戠痪顖涙瀮閺堫剙鍞寸€瑰箍鈧? */
void getMessageRenderSignature;
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/**
 * 濞撳弶鐓嬮幀婵娾偓鍐ц厬閻ㄥ嫬宕版担宥嗙毜濞壜扳偓? */
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
 * 濞撳弶鐓嬫径杈Е閹绘劗銇氬鏃€鍦洪妴? */
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
 * 閸楁洘娼€电鐦藉鏃€鍦洪妴? */
function MessageBubble({
  message,
  renderSignature,
  isThinking = false,
  isFailure = false,
  preferPlainText = false,
  failureText = "鐠囬攱鐪版径杈Е閿涘苯褰查柌宥堢槸",
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
  void renderSignature;
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
  const reasoningParts = getReasoningParts(message);
  const toolParts = getToolParts(message);

  if (
    !messageText &&
    reasoningParts.length === 0 &&
    toolParts.length === 0 &&
    !isEditing
  ) {
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
        {!isUserMessage
          ? reasoningParts.map((part) => (
              <div
                key={part.key}
                className="rounded-2xl border border-[var(--ui-border-soft)] bg-[color:rgba(255,255,255,0.38)] px-4 py-3 text-sm leading-6 text-[var(--ui-text-muted)] shadow-[0_12px_24px_var(--ui-shadow)] dark:bg-[color:rgba(255,255,255,0.03)]"
              >
                <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ui-text-faint)]">
                  <Brain className="size-3.5" />
                  <span>Reasoning</span>
                  {part.isStreaming ? (
                    <motion.span
                      animate={{ opacity: [0.35, 1, 0.35] }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                      className="rounded-full border border-[var(--ui-border-soft)] px-2 py-0.5 text-[10px] tracking-[0.12em] text-[var(--ui-accent-strong)]"
                    >
                      streaming
                    </motion.span>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap break-words">{part.text}</p>
              </div>
            ))
          : null}

        {!isUserMessage
          ? toolParts.map((part) => (
              <ToolBubble
                key={part.key}
                title={part.title}
                status={part.status}
                input={getToolContentText(part.input)}
                output={getToolContentText(part.output)}
                errorText={part.errorText}
              />
            ))
          : null}

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
            {isUserMessage ? (
              <p className="whitespace-pre-wrap break-words">{messageText}</p>
            ) : preferPlainText ? (
              <p className="whitespace-pre-wrap break-words">{messageText}</p>
            ) : (
              <RichMessageContent content={messageText} />
            )}
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

function areMessageBubblePropsEqual(
  previousProps: MessageBubbleProps,
  nextProps: MessageBubbleProps
) {
  return (
    previousProps.isThinking === nextProps.isThinking &&
    previousProps.isFailure === nextProps.isFailure &&
    previousProps.failureText === nextProps.failureText &&
    previousProps.renderSignature === nextProps.renderSignature &&
    previousProps.preferPlainText === nextProps.preferPlainText &&
    previousProps.canEdit === nextProps.canEdit &&
    previousProps.canRetry === nextProps.canRetry &&
    previousProps.editingValue === nextProps.editingValue &&
    previousProps.isActionDisabled === nextProps.isActionDisabled &&
    previousProps.isEditing === nextProps.isEditing
  );
}

export default memo(MessageBubble, areMessageBubblePropsEqual);
