import { toBaseMessages, toUIMessageStream } from "@ai-sdk/langchain";
import { createUIMessageStreamResponse, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
export const maxDuration = 60;
import {
  appendChatMessage,
  getOrCreateUserChat,
  rerunLastUserMessage,
  touchChat,
} from "@/lib/chat-utils";
import { createAgentExecutor } from "@/lib/aiAgent";
import { getCurrentLoginUser } from "@/lib/supabase-server";

const runChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  mode: z.enum(["create", "rerun-last-user"]).optional(),
  messages: z.array(z.unknown()).min(1, "messages is required"),
});

/**
 * 提取消息中的纯文本内容。
 */

/**
 * 提取消息中的纯文本内容。
 */
function getMessageText(message: UIMessage | undefined): string {
  if (!message) {
    return "";
  }

  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

/**
 * 截断首条消息作为会话标题。
 */
function getConversationTitle(content: string): string {
  return content.length > 80 ? `${content.slice(0, 80)}...` : content;
}

/**
 * 处理聊天 POST 请求，并返回流式响应。
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentLoginUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY || !process.env.TAVILY_API_KEY) {
      return NextResponse.json(
        { error: "Missing required API keys in environment variables." },
        { status: 500 }
      );
    }

    const json = await request.json();
    const { conversationId, messages, mode } = runChatRequestSchema.parse(json);
    const uiMessages = messages as UIMessage[];
    const latestUserMessage = [...uiMessages]
      .reverse()
      .find((message) => message.role === "user");
    const userMessageText = getMessageText(latestUserMessage);

    if (!userMessageText) {
      return NextResponse.json(
        { error: "User message content is required." },
        { status: 400 }
      );
    }

    const requestMode = mode ?? "create";
    let activeConversationId = conversationId;

    if (requestMode === "create") {
      activeConversationId = await getOrCreateUserChat(
        user.id,
        conversationId,
        getConversationTitle(userMessageText)
      );

      if (!activeConversationId) {
        return NextResponse.json({ error: "Chat not found." }, { status: 404 });
      }

      await appendChatMessage({
        conversationId: activeConversationId,
        role: "USER",
        content: userMessageText,
      });
      await touchChat(activeConversationId);
    } else {
      if (!activeConversationId) {
        return NextResponse.json(
          { error: "Conversation id is required." },
          { status: 400 }
        );
      }

      const rerunResult = await rerunLastUserMessage({
        userId: user.id,
        conversationId: activeConversationId,
        content: userMessageText,
      });

      if (!rerunResult) {
        return NextResponse.json(
          { error: "Last user message not found." },
          { status: 404 }
        );
      }
    }

    const agentExecutor = createAgentExecutor(user.id);
    const langchainMessages = await toBaseMessages(uiMessages);
    const stream = await agentExecutor.stream(
      {
        messages: langchainMessages,
      },
      {
        streamMode: ["values", "messages"],
      }
    );

    let didAbort = false;

    return createUIMessageStreamResponse({
      stream: toUIMessageStream(stream, {
        async onFinal(completion) {
          if (didAbort || !completion.trim()) {
            return;
          }

          await appendChatMessage({
            conversationId: activeConversationId,
            role: "ASSISTANT",
            content: completion,
          });
          await touchChat(activeConversationId);
        },
        onAbort() {
          didAbort = true;
        },
        onError(error) {
          console.error("runChat stream error:", error);
        },
      }),
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "X-Conversation-Id": activeConversationId,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to run chat agent.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
