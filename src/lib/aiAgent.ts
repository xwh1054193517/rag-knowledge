import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

/**
 * 项目统一使用的基础聊天模型。
 */
export const chatModel = new ChatOpenAI({
  model: process.env.MODEL_NAME || "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
});

/**
 * 创建一个简单的问答链，使用 LangChain 1.x 的 runnable 风格。
 */
export function createChatChain() {
  const prompt = ChatPromptTemplate.fromTemplate(
    "You are a helpful AI assistant. Answer the user's question: {question}"
  );

  return prompt.pipe(chatModel);
}

/**
 * 执行一次基础问答，供 API 或其他服务端逻辑调用。
 */
export async function invokeChat(question: string) {
  const chain = createChatChain();
  return chain.invoke({ question });
}
