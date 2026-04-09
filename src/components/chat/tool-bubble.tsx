"use client";

import { CheckCircle2, LoaderCircle, Wrench, XCircle } from "lucide-react";

interface ToolBubbleProps {
  title: string;
  status: "running" | "success" | "error";
  input?: string;
  output?: string;
  errorText?: string;
}

/**
 * 工具调用状态卡片。
 */
export default function ToolBubble({
  title,
  status,
  input,
  output,
  errorText,
}: ToolBubbleProps) {
  const statusConfig =
    status === "running"
      ? {
          icon: LoaderCircle,
          label: "Running",
          className: "text-[var(--ui-accent-strong)]",
          iconClassName: "animate-spin",
        }
      : status === "success"
        ? {
            icon: CheckCircle2,
            label: "Completed",
            className: "text-emerald-500",
            iconClassName: "",
          }
        : {
            icon: XCircle,
            label: "Failed",
            className: "text-rose-500",
            iconClassName: "",
          };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="rounded-2xl border border-[var(--ui-border-soft)] bg-[linear-gradient(180deg,var(--ui-surface),var(--ui-surface-muted))] px-4 py-3 shadow-[0_12px_24px_var(--ui-shadow)]">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface)] text-[var(--ui-accent-strong)]">
          <Wrench className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[var(--ui-text)]">
            {title}
          </div>
          <div
            className={`flex items-center gap-1 text-xs ${statusConfig.className}`}
          >
            <StatusIcon className={`size-3.5 ${statusConfig.iconClassName}`} />
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </div>

      {input ? (
        <div className="mt-3 rounded-xl bg-[var(--ui-surface)] px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ui-text-faint)]">
            Input
          </div>
          <pre className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-[var(--ui-text-muted)]">
            {input}
          </pre>
        </div>
      ) : null}

      {/* {output ? (
        <div className="mt-3 rounded-xl bg-[var(--ui-surface)] px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ui-text-faint)]">
            Output
          </div>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-[var(--ui-text-muted)]">
            {output}
          </pre>
        </div>
      ) : null}

      {errorText ? (
        <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-600 dark:text-rose-300">
          {errorText}
        </div>
      ) : null} */}
    </div>
  );
}
