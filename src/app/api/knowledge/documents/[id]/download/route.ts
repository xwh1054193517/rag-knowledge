import { NextResponse } from "next/server";

import { downloadKnowledgeDocument } from "@/lib/knowledge";
import { getCurrentLoginUser } from "@/lib/supabase-server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Download a private knowledge document owned by the current user.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getCurrentLoginUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await downloadKnowledgeDocument(user.id, id);

    if (!result) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    const arrayBuffer = await result.blob.arrayBuffer();
    const fileName = encodeURIComponent(
      result.document.fileName ?? `${result.document.id}.bin`
    );

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": result.document.mimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to download document.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
