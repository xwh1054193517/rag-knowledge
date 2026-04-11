import { TavilySearch } from "@langchain/tavily";
import { createAgent, tool } from "langchain";
import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import { z } from "zod";

import { searchKnowledgeBase } from "@/lib/knowledge";

function createLLM() {
  if (process.env.OPENROUTER_API_KEY) {
    return new ChatOpenRouter({
      model: process.env.MODEL_NAME ?? "openrouter/free",
      temperature: 0,
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }

  return new ChatOpenAI({
    model: process.env.MODEL_NAME ?? "gpt-4o-mini",
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    },
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

function createKnowledgeSearchTool(userId: string) {
  return tool(
    async ({ query }) => {
      const result = await searchKnowledgeBase(userId, query);
      return JSON.stringify(result);
    },
    {
      name: "knowledge_search",
      description:
        "Search the current user's private knowledge base. Use this before web search for user-specific files, uploaded documentation, notes, product specs, or project context.",
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
    "You have access to a private knowledge base tool named knowledge_search and a web tool named tavily_search.",
    "Always try knowledge_search first when the user might be asking about their uploaded files, private documents, notes, manuals, internal context, or project knowledge.",
    "Use tavily_search only when the private knowledge base does not have relevant results or the user clearly needs current web information.",
    'When calling knowledge_search, you must pass valid JSON arguments in the form {"query":"..."}.',
    'When calling tavily_search, you must pass valid JSON arguments in the form {"query":"..."}.',
    "Reply in the same language as the user.",
    "If the user asks about weather, news, prices, announcements, recent events, latest developments, or official website information, proactively use tavily_search after knowledge_search is not relevant or returns no useful match.",
    "When knowledge_search returns relevant results, answer from those results first.",
    "If you use private knowledge base results, cite them inline with the provided citation labels, such as [handbook.pdf#chunk-2].",
    "Prefer concise citations near the sentence they support instead of adding a separate reference section unless the user asks for one.",
    "When you need to output a flowchart, architecture diagram, sequence diagram, ER diagram, state diagram, or gantt chart, you must use a Mermaid fenced code block.",
    "Do not output bare mermaid text. Do not mix Mermaid syntax and normal explanation on the same line. Do not use ASCII art instead of diagrams.",
    "Always format Mermaid diagrams like this:",
    "```mermaid",
    "graph TD",
    "  A[Start] --> B[End]",
    "```",
  ].join("\n");
}

export function createAgentExecutor(userId: string) {
  const llm = createLLM();
  const prompt = buildPrompt();

  return createAgent({
    model: llm,
    tools: [createKnowledgeSearchTool(userId), createSearchTool()],
    systemPrompt: prompt,
  });
}
