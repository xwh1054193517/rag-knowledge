import { TavilySearch } from "@langchain/tavily";
import { createAgent, tool } from "langchain";
import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import { z } from "zod";

function createLLM() {
  // return new ChatOpenAI({
  //   temperature: 0,
  // });
  return new ChatOpenRouter({
    // model: process.env.MODEL_NAME ?? "minimax/minimax-m2.5:free",
    model: "openrouter/free",
    temperature: 0,
    apiKey: process.env.OPENROUTER_API_KEY,
  });
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
        "Search the latest real-time web information for news, weather, prices, announcements, webpages, and recent updates.",
      schema: z.object({
        query: z.string().min(1, "query is required"),
      }),
    }
  );
}

function buildPrompt() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return [
    `You are a helpful AI assistant. Today's date is ${currentDate}.`,
    "When a question needs current, real-time, or web-verified information, prefer using tavily_search instead of answering from memory.",
    'When calling tavily_search, you must pass valid JSON arguments in the form {"query":"..."}.',
    "Reply in the same language as the user.",
    "If the user asks about weather, news, prices, announcements, recent events, latest developments, or official website information, proactively use tavily_search.",
    "When you need to output a flowchart, architecture diagram, sequence diagram, ER diagram, state diagram, or gantt chart, you must use a Mermaid fenced code block.",
    "Do not output bare mermaid text. Do not mix Mermaid syntax and normal explanation on the same line. Do not use ASCII art instead of diagrams.",
    "Always format Mermaid diagrams like this:",
    "```mermaid",
    "graph TD",
    "  A[Start] --> B[End]",
    "```",
  ].join("\n");
}

export function createAgentExecutor(_userId: string) {
  void _userId;

  const llm = createLLM();
  const prompt = buildPrompt();

  return createAgent({
    model: llm,
    tools: [createSearchTool()],
    systemPrompt: prompt,
  });
}
