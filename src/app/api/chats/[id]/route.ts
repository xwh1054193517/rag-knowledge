import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteUserChat, getUserChatDetail } from "@/lib/chat-utils";
import { getCurrentLoginUser } from "@/lib/supabase-server";

const routeParamsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * 获取单个会话详情。
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentLoginUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = routeParamsSchema.parse(await context.params);
    const conversation = await getUserChatDetail(user.id, params.id);

    if (!conversation) {
      return NextResponse.json({ error: "Chat not found." }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch chat detail.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 删除指定会话。
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentLoginUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = routeParamsSchema.parse(await context.params);
    const deleted = await deleteUserChat(user.id, params.id);

    if (!deleted) {
      return NextResponse.json({ error: "Chat not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete chat.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
