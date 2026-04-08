import { NextResponse } from "next/server";
import { z } from "zod";

import { createUserChat, listUserChats } from "@/lib/chat-utils";
import { getCurrentLoginUser } from "@/lib/supabase-server";

const listChatsQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});

const createChatSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "title is required")
    .max(200, "title is too long"),
});

/**
 * 获取当前用户的会话列表。
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentLoginUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { cursor, limit } = listChatsQuerySchema.parse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    const result = await listUserChats(user.id, { cursor, limit });

    return NextResponse.json({
      items: result.items,
      nextCursor: result.nextCursor,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch chats.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 创建新的会话记录。
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentLoginUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { title } = createChatSchema.parse(json);
    const conversation = await createUserChat(user.id, title);

    return NextResponse.json(conversation, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create chat.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
