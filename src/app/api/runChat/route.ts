import { toBaseMessages, toUIMessageStream } from "@ai-sdk/langchain";
import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
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
 * 工具摘要提取
 */
function getToolCallsFromFinalState(finalState: unknown) {
  if (!finalState || typeof finalState !== "object") {
    return undefined;
  }

  const state = finalState as {
    messages?: BaseMessage[];
  };

  if (!Array.isArray(state.messages)) {
    return undefined;
  }

  //先找到 finalState.messages 里最后一条用户消息
  //只看这条用户消息之后的消息，作为“当前轮次”
  //在这段当前轮次里：
  //收集所有 AIMessage / AIMessageChunk 上的 tool_calls
  //收集所有 invalid_tool_calls
  //用 toolCallId 去匹配对应的 ToolMessage
  //最终把这一整轮里多批工具调用都合并成 tool_calls 摘要
  const lastHumanMessageIndex = [...state.messages]
    .map((message, index) => ({ message, index }))
    .reverse()
    .find(({ message }) => HumanMessage.isInstance(message))?.index;

  const currentTurnMessages =
    lastHumanMessageIndex === undefined
      ? state.messages
      : state.messages.slice(lastHumanMessageIndex + 1);

  const toolMessages = currentTurnMessages.filter((message) =>
    ToolMessage.isInstance(message)
  ) as ToolMessage[];

  const toolCallMessages = currentTurnMessages.filter((message) => {
    if (AIMessage.isInstance(message) || AIMessageChunk.isInstance(message)) {
      return (
        (message.tool_calls?.length ?? 0) > 0 ||
        (message.invalid_tool_calls?.length ?? 0) > 0
      );
    }

    return false;
  }) as Array<AIMessage | AIMessageChunk>;

  if (toolCallMessages.length === 0) {
    return undefined;
  }

  const validToolCalls = toolCallMessages.flatMap((message) =>
    (message.tool_calls ?? []).map((toolCall) => {
      const matchedToolMessage = toolMessages.find(
        (toolMessage) => toolMessage.tool_call_id === toolCall.id
      );

      if (!matchedToolMessage) {
        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          status: "error",
          inputSummary: JSON.stringify(toolCall.args ?? {}),
          errorText: "Tool output message was not found in final state.",
        };
      }

      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        status: "success",
        inputSummary: JSON.stringify(toolCall.args ?? {}),
        outputSummary:
          typeof matchedToolMessage.content === "string"
            ? matchedToolMessage.content
            : JSON.stringify(matchedToolMessage.content),
      };
    })
  );

  const invalidToolCalls = toolCallMessages.flatMap((message) =>
    (message.invalid_tool_calls ?? []).map((toolCall) => ({
      toolCallId: toolCall.id ?? "",
      toolName: toolCall.name ?? "",
      status: "error",
      inputSummary: JSON.stringify(toolCall.args ?? {}),
      errorText:
        typeof toolCall.error === "string"
          ? toolCall.error
          : String(toolCall.error ?? "Invalid tool call"),
    }))
  );

  const toolCalls = [...validToolCalls, ...invalidToolCalls];

  return toolCalls.length > 0 ? toolCalls : undefined;
}

function isClosedControllerError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Controller is already closed") ||
    ("code" in error &&
      typeof error.code === "string" &&
      error.code === "ERR_INVALID_STATE")
  );
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
    let activeConversationId: string | null = conversationId ?? null;

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

    if (!activeConversationId) {
      return NextResponse.json(
        { error: "Conversation id is required." },
        { status: 400 }
      );
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
    let finalGraphState: unknown;
    let finalCompletion = "";
    let didPersistAssistantMessage = false;

    async function persistAssistantMessageIfReady() {
      if (
        didAbort ||
        didPersistAssistantMessage ||
        !activeConversationId ||
        !finalCompletion.trim() ||
        finalGraphState === undefined
      ) {
        return;
      }

      didPersistAssistantMessage = true;

      await appendChatMessage({
        conversationId: activeConversationId,
        role: "ASSISTANT",
        content: finalCompletion,
        toolCalls: getToolCallsFromFinalState(finalGraphState),
      });
      await touchChat(activeConversationId);
    }

    return createUIMessageStreamResponse({
      stream: toUIMessageStream(stream, {
        async onFinal(completion) {
          finalCompletion = completion;
          await persistAssistantMessageIfReady();
        },
        async onFinish(finalState) {
          finalGraphState = finalState;
          await persistAssistantMessageIfReady();
        },
        onAbort() {
          didAbort = true;
        },
        onError(error) {
          if (didAbort || isClosedControllerError(error)) {
            return;
          }

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
