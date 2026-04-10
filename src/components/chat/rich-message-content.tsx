"use client";

import { Children, isValidElement, memo, type ReactNode, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import MermaidRenderer from "@/components/chat/mermaid-renderer";

interface RichMessageContentProps {
  content: string;
}

const MERMAID_STARTERS = [
  "mermaid",
  "graph",
  "flowchart",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "erDiagram",
  "journey",
  "gantt",
];

function normalizeSequenceDiagram(chart: string) {
  return chart
    .replace(/\s+(participant|actor)\s+/g, "\n$1 ")
    .replace(
      /\s+(loop|alt|else|opt|par|and|critical|break|rect|Note)\s+/g,
      "\n$1 "
    )
    .replace(/\s+end(\s|$)/g, "\nend$1")
    .replace(
      /\s+([A-Za-z0-9_]+[-.]*[A-Za-z0-9_]*-+>>?[A-Za-z0-9_]+[-.]*[A-Za-z0-9_]*:)/g,
      "\n$1"
    );
}

function findMermaidStart(content: string) {
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const trimmedLine = lines[i].trimStart();

    if (
      MERMAID_STARTERS.some(
        (starter) =>
          trimmedLine === starter || trimmedLine.startsWith(`${starter} `)
      )
    ) {
      return i;
    }
  }

  return -1;
}

function normalizeMermaidBlock(content: string) {
  if (content.includes("```mermaid")) {
    return content;
  }

  const mermaidStartIndex = findMermaidStart(content);

  if (mermaidStartIndex === -1) {
    return content;
  }

  const lines = content.split("\n");
  const beforeDiagram = lines.slice(0, mermaidStartIndex).join("\n").trimEnd();
  const mermaidAndAfter = lines.slice(mermaidStartIndex).join("\n").trimStart();
  const firstBlankLineIndex = mermaidAndAfter.search(/\n\s*\n/);
  const diagramSource =
    firstBlankLineIndex === -1
      ? mermaidAndAfter
      : mermaidAndAfter.slice(0, firstBlankLineIndex);
  const remainingContent =
    firstBlankLineIndex === -1
      ? ""
      : mermaidAndAfter.slice(firstBlankLineIndex).trimStart();

  let diagram = diagramSource.replace(/^mermaid\s+/, "").trim();

  if (diagram.startsWith("sequenceDiagram")) {
    diagram = normalizeSequenceDiagram(diagram);
  }

  const fencedDiagram = `\`\`\`mermaid\n${diagram}\n\`\`\``;
  const normalizedParts = [
    beforeDiagram,
    fencedDiagram,
    remainingContent,
  ].filter(Boolean);

  return normalizedParts.join("\n\n");
}

function getCodeLanguage(className?: string) {
  if (!className) {
    return "";
  }

  const match = className.match(/language-([\w-]+)/);
  return match?.[1] ?? "";
}

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => getNodeText(child)).join("");
  }

  if (isValidElement(node)) {
    const elementProps = node.props as {
      children?: ReactNode;
    };

    return getNodeText(elementProps.children);
  }

  return Children.toArray(node)
    .map((child) => getNodeText(child))
    .join("");
}

function RichMessageContent({ content }: RichMessageContentProps) {
  const normalizedContent = useMemo(
    () => normalizeMermaidBlock(content),
    [content]
  );

  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const language = getCodeLanguage(className);
            const code = getNodeText(children).replace(/\n$/, "");
            const isInline = !className;

            if (isInline) {
              return (
                <code className="rounded bg-[var(--ui-surface-muted)] px-1.5 py-0.5 text-[0.92em] text-[var(--ui-text)]">
                  {children}
                </code>
              );
            }

            if (language === "mermaid") {
              return <MermaidRenderer chart={code} />;
            }

            return (
              <pre className="overflow-x-auto rounded-2xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface-muted)] p-4">
                <code className={className} {...props}>
                  {code}
                </code>
              </pre>
            );
          },
          a({ children, ...props }) {
            return (
              <a
                {...props}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--ui-accent-strong)] underline decoration-[color:color-mix(in_srgb,var(--ui-accent-strong)_42%,transparent)] underline-offset-4 transition hover:opacity-85"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto">
                <table>{children}</table>
              </div>
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}

export default memo(RichMessageContent);
