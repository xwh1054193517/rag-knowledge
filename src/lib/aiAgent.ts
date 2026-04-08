// import { ChatOpenRouter } from "@langchain/openrouter";
import { TavilySearch } from "@langchain/tavily";
import { createAgent, DynamicStructuredTool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
function createLLM() {
  return new ChatOpenAI({
    temperature: 0,
  });
  // return new ChatOpenRouter({
  //   model: process.env.MODEL_NAME ?? "minimax/minimax-m2.5:free",
  //   temperature: 0,
  //   apiKey: process.env.OPENROUTER_API_KEY,
  // });
}

function buildPrompt() {
  const currentDate = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return `你是一个强大且乐于助人的AI助手。
当前时间是：${currentDate}。
每次回答前需要最新实时信息，使用联网搜索。
当需要绘制流程图、架构图、时序图等图表时，请始终使用 Mermaid 语法，格式如下：
\`\`\`mermaid
图表内容
\`\`\`
不要使用 ASCII 字符、竖线或文本来绘制图表。`;
}

export function createAgentExecutor(userId: string) {
  const llm = createLLM();
  const prompt = buildPrompt();

  return createAgent({
    model: llm,
    systemPrompt: `${prompt}`,
  });
}
