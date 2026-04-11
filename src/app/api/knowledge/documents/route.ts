import { NextResponse } from "next/server";

import {
  listKnowledgeDocuments,
  uploadKnowledgeDocument,
} from "@/lib/knowledge";
import { getCurrentLoginUser } from "@/lib/supabase-server";

/**
 * List the current user's private knowledge documents.
 */
export async function GET() {
  try {
    const user = await getCurrentLoginUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await listKnowledgeDocuments(user.id);

    return NextResponse.json({ items });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load knowledge documents.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Upload and ingest a private knowledge document.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentLoginUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A file upload is required." },
        { status: 400 }
      );
    }

    const document = await uploadKnowledgeDocument(user.id, file);

    return NextResponse.json({ item: document }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to upload document.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
