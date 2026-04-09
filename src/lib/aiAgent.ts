import { TavilySearch } from "@langchain/tavily";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, tool } from "langchain";
import { ChatOpenRouter } from "@langchain/openrouter";
import "dotenv/config";
import { z } from "zod";

function createLLM() {
  return new ChatOpenRouter({
    // model: process.env.MODEL_NAME ?? "minimax/minimax-m2.5:free",
    model: "openrouter/free",
    temperature: 0,
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  // 中转模型对tool calls有问题
  // return new ChatOpenAI({
  //   model: process.env.MODEL_NAME ?? "gpt-4.1-mini",
  //   temperature: 0,
  // });
}

function createSearchTool() {
  const tavilySearch = new TavilySearch({
    maxResults: 5,
    tavilyApiKey: process.env.TAVILY_API_KEY,
    topic: "general",
  });

  return tool(
    async ({ query }) => {
      const result = await tavilySearch.invoke({ query });
      return JSON.stringify(result);
    },
    {
      name: "tavily_search",
      description:
        "搜索最新的实时网络信息，适合新闻、天气、价格、公告、网页资料与近期动态查询。",
      schema: z.object({
        query: z.string().min(1, "query is required"),
      }),
    }
  );
}

function buildPrompt() {
  const currentDate = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return `你是一个乐于助人的 AI 助手。
当前日期是：${currentDate}。
当问题需要最新、实时、联网才能确认的信息时，优先调用 tavily_search 工具，而不是直接凭记忆回答。
调用 tavily_search 时，必须传入合法 JSON 参数，格式为 {"query":"..."}。
用户用什么语言提问，你用什么语言回答
如果用户在问天气、新闻、价格、公告、近期事件、最新进展、官网信息等内容，应主动使用 tavily_search。
当需要绘制流程图、架构图、时序图等图表时，请始终使用 Mermaid，格式如下：
\`\`\`mermaid
图表内容
\`\`\`
不要使用 ASCII 字符画来代替图表。`;
}

export function createAgentExecutor(userId: string) {
  const llm = createLLM();
  const prompt = buildPrompt();

  return createAgent({
    model: llm,
    tools: [createSearchTool()],
    systemPrompt: prompt,
  });
}
