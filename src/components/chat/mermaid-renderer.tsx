"use client";

import { memo, useEffect, useId, useState } from "react";
import mermaid from "mermaid";

interface MermaidRendererProps {
  chart: string;
}

let isMermaidInitialized = false;
const mermaidSvgCache = new Map<string, string>();

function MermaidRenderer({ chart }: MermaidRendererProps) {
  const [renderState, setRenderState] = useState<{
    chart: string;
    svg: string;
    error: string | null;
  }>({
    chart,
    svg: "",
    error: null,
  });
  const diagramId = useId().replace(/:/g, "-");
  const cachedSvg = mermaidSvgCache.get(chart);
  const displayedSvg = renderState.chart === chart ? renderState.svg : "";
  const displayedError = renderState.chart === chart ? renderState.error : null;

  useEffect(() => {
    let isMounted = true;

    if (cachedSvg) {
      return () => {
        isMounted = false;
      };
    }

    async function renderDiagram() {
      try {
        if (!isMermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "neutral",
            securityLevel: "loose",
          });
          isMermaidInitialized = true;
        }

        await mermaid.parse(chart, {
          suppressErrors: false,
        });

        const { svg: renderedSvg } = await mermaid.render(
          `mermaid-${diagramId}`,
          chart
        );

        if (!isMounted) {
          return;
        }

        mermaidSvgCache.set(chart, renderedSvg);
        setRenderState({
          chart,
          svg: renderedSvg,
          error: null,
        });
      } catch (renderError) {
        if (!isMounted) {
          return;
        }

        setRenderState({
          chart,
          svg: "",
          error:
            renderError instanceof Error
              ? renderError.message
              : "Mermaid render failed.",
        });
      }
    }

    const renderTimer = window.setTimeout(() => {
      void renderDiagram();
    }, 220);

    return () => {
      isMounted = false;
      window.clearTimeout(renderTimer);
    };
  }, [cachedSvg, chart, diagramId]);

  if (displayedError) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Mermaid render failed. Falling back to a code block.
        </div>
        <pre className="overflow-x-auto rounded-2xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface-muted)] p-4">
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  if (!cachedSvg && !displayedSvg) {
    return (
      <div className="rounded-2xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface-muted)] px-4 py-3 text-sm text-[var(--ui-text-faint)]">
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      className="chat-mermaid rounded-2xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface)] p-4"
      dangerouslySetInnerHTML={{ __html: cachedSvg ?? displayedSvg }}
    />
  );
}

export default memo(MermaidRenderer);
