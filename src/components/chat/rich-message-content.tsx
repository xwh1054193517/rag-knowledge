"use client";

import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  memo,
  type ReactElement,
  type ReactNode,
  useMemo,
} from "react";
import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import MermaidRenderer from "@/components/chat/mermaid-renderer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RichMessageContentProps {
  content: string;
  citations?: Map<
    string,
    {
      citationLabel: string;
      fileName: string;
      chunkIndex: number;
      excerpt: string;
      similarity: number;
    }
  >;
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

function CitationInline({
  citation,
}: {
  citation: {
    citationLabel: string;
    fileName: string;
    chunkIndex: number;
    excerpt: string;
    similarity: number;
  };
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mx-1 inline-flex items-center gap-1 rounded-full border border-[var(--ui-border-soft)] bg-[var(--ui-surface)] px-2 py-1 text-xs font-medium text-[var(--ui-accent-strong)] shadow-sm transition hover:border-[var(--ui-accent)] hover:bg-[var(--ui-surface-muted)]"
        >
          <FileText className="size-3.5" />
          {citation.citationLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-[1.5rem] border border-[var(--ui-border-soft)] bg-[var(--ui-surface)]">
        <DialogHeader>
          <DialogTitle>{citation.fileName}</DialogTitle>
          <DialogDescription>
            Chunk {citation.chunkIndex + 1}
            {citation.similarity > 0
              ? ` · similarity ${(citation.similarity * 100).toFixed(1)}%`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface-muted)] px-4 py-4 text-sm leading-7 text-[var(--ui-text-muted)]">
          {citation.excerpt}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function splitTextWithCitations(
  value: string,
  citations: NonNullable<RichMessageContentProps["citations"]>
) {
  const pattern = /\[[^\]]+#chunk-\d+\]/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  match = pattern.exec(value);
  while (match) {
    const [label] = match;
    const startIndex = match.index;

    if (startIndex > lastIndex) {
      nodes.push(value.slice(lastIndex, startIndex));
    }

    const citation = citations.get(label);
    if (citation) {
      nodes.push(
        <CitationInline key={`${label}-${startIndex}`} citation={citation} />
      );
    } else {
      nodes.push(label);
    }

    lastIndex = startIndex + label.length;
    match = pattern.exec(value);
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [value];
}

function renderNodesWithCitations(
  node: ReactNode,
  citations: RichMessageContentProps["citations"]
): ReactNode {
  if (!citations || citations.size === 0) {
    return node;
  }

  if (typeof node === "string") {
    return splitTextWithCitations(node, citations).map((item, index) => (
      <Fragment key={index}>{item}</Fragment>
    ));
  }

  if (typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <Fragment key={index}>
        {renderNodesWithCitations(child, citations)}
      </Fragment>
    ));
  }

  if (isValidElement(node)) {
    const elementProps = node.props as {
      children?: ReactNode;
    };
    const elementWithChildren = node as ReactElement<{
      children?: ReactNode;
    }>;

    return (
      <Fragment>
        {cloneElement(elementWithChildren, {
          children: renderNodesWithCitations(elementProps.children, citations),
        })}
      </Fragment>
    );
  }

  return node;
}

function renderChildrenWithCitations(
  children: ReactNode,
  citations: RichMessageContentProps["citations"]
) {
  return Children.map(children, (child) =>
    renderNodesWithCitations(child, citations)
  );
}

function RichMessageContent({ content, citations }: RichMessageContentProps) {
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
          p({ children }) {
            return <p>{renderChildrenWithCitations(children, citations)}</p>;
          },
          li({ children }) {
            return <li>{renderChildrenWithCitations(children, citations)}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote>
                {renderChildrenWithCitations(children, citations)}
              </blockquote>
            );
          },
          strong({ children }) {
            return (
              <strong>
                {renderChildrenWithCitations(children, citations)}
              </strong>
            );
          },
          em({ children }) {
            return <em>{renderChildrenWithCitations(children, citations)}</em>;
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
