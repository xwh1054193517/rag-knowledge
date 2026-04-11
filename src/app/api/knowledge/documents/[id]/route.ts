import { NextResponse } from "next/server";

import { deleteKnowledgeDocument } from "@/lib/knowledge";
import { getCurrentLoginUser } from "@/lib/supabase-server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Delete a private knowledge document owned by the current user.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getCurrentLoginUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = await deleteKnowledgeDocument(user.id, id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete document.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
