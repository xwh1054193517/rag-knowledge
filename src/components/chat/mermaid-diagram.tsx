"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
}

let isMermaidInit = false;
function ensureInitialized() {
  if (!isMermaidInit) {
    isMermaidInit = true;
    mermaid.initialize({
      startOnLoad: false, // 不自动加载
      suppressErrorRendering: true, // 抑制错误渲染
      theme: "dark", // 暗黑主题
      securityLevel: "loose",
      themeVariables: {
        primaryColor: "#1e3a5f", // 主颜色
        primaryTextColor: "#e7e7e4", // 主文本颜色
        primaryBorderColor: "#3b82f6", // 主边框颜色
        lineColor: "#6b8bad", // 线条颜色
        secondaryColor: "#2d2c25", // 次要颜色
        tertiaryColor: "#23221d", // 第三级颜色
        background: "#1e1e19", // 背景颜色
        mainBkg: "#1e3a5f", // 主背景
        nodeBorder: "#3b82f6", // 节点边框
        clusterBkg: "#23221d", // 集群背景
        titleColor: "#e7e7e4", // 标题颜色
        edgeLabelBackground: "#23221d", // 边标签背景
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", // 字体
      },
    });
  }
}
// Mermaid 图表计数器
let mermaidCounter = 0;
export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const [error, setError] = useState<string | null>(null);
  // 初始用 null 表示"尚未触发渲染"，骨架图一直显示到首次成功为止
  const [svg, setSvg] = useState<string | null>(null);
  // 防止同一 chart 内容被多次渲染（debounce 计时器）
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 保留最后一次成功的 SVG 避免闪白
  const lastSvgRef = useRef<string | null>(null);

  useEffect(() => {
    ensureInitialized();

    // 如果已有上一次的结果，先保持显示（不重置成 null 闪烁）
    // 只在第一次 (lastSvgRef 为 null) 时才显示骨架屏
    if (lastSvgRef.current) {
      setSvg(lastSvgRef.current);
    }

    // 清除上一个 debounce 定时器
    if (timerRef.current) clearTimeout(timerRef.current);

    // 等内容 500ms 不变化后再渲染
    timerRef.current = setTimeout(async () => {
      const id = `mermaid-${++mermaidCounter}-${Date.now()}`;
      try {
        // 解析 Mermaid 代码
        await mermaid.parse(chart);
        // 渲染图表
        const { svg } = await mermaid.render(id, chart);
        if (svg.includes("Syntax error")) {
          setError("图表语法存在错误");
        } else {
          lastSvgRef.current = svg;
          setSvg(svg);
          setError(null);
        }
      } catch (err: any) {
        // 流式生成过程中内容不完整会出错，直接忽略，保持上一次结果
        // 只有在内容稳定后仍然失败才显示错误
        setError(err?.message || "Mermaid 图表语法错误");
      }
    }, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [chart]);

  if (svg) {
    return (
      <div>
        <div
          className="chat-mermaid rounded-2xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface)] p-4"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    );
  }
  // 渲染错误信息
  if (error && !lastSvgRef.current) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Mermaid 渲染失败，已回退为代码块显示。
        </div>
        <pre className="overflow-x-auto rounded-2xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface-muted)] p-4">
          <code>{chart}</code>
        </pre>
      </div>
    );
  }
  // 骨架占位（首次加载 / 流式生成期间）
  return (
    <div className="my-3 p-4 rounded-xl bg-black/20 border border-white/5 flex items-center justify-center h-20 text-gray-500 text-xs gap-2">
      <span className="inline-block w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.3s]" />
      <span className="inline-block w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.15s]" />
      <span className="inline-block w-2 h-2 rounded-full bg-gray-500 animate-bounce" />
    </div>
  );
}
