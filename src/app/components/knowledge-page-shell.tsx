"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KnowledgePageShellProps {
  userEmail: string;
}

interface KnowledgeDocumentItem {
  id: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  status: "PROCESSING" | "READY" | "FAILED";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  chunkCount: number;
}

interface UploadProgressState {
  fileName: string;
  progress: number;
  stage: "uploading" | "processing";
}

function formatFileSize(fileSize: number | null) {
  if (!fileSize) {
    return "Unknown size";
  }

  if (fileSize < 1024) {
    return `${fileSize} B`;
  }

  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

function formatStatus(status: KnowledgeDocumentItem["status"]) {
  if (status === "READY") {
    return "Ready";
  }

  if (status === "FAILED") {
    return "Failed";
  }

  return "Processing";
}

export default function KnowledgePageShell({
  userEmail,
}: KnowledgePageShellProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgressState | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null
  );
  const [pendingDeleteDocument, setPendingDeleteDocument] =
    useState<KnowledgeDocumentItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDocuments() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/knowledge/documents", {
        credentials: "include",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to load documents.");
      }

      const data = (await response.json()) as {
        items: KnowledgeDocumentItem[];
      };

      setDocuments(data.items);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load documents."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress({
      fileName: file.name,
      progress: 0,
      stage: "uploading",
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadedDocument = await new Promise<KnowledgeDocumentItem>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.open("POST", "/api/knowledge/documents");
          xhr.withCredentials = true;

          xhr.upload.onprogress = (progressEvent) => {
            if (!progressEvent.lengthComputable) {
              return;
            }

            const rawProgress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            const progress = Math.min(rawProgress, 90);

            setUploadProgress({
              fileName: file.name,
              progress,
              stage: "uploading",
            });
          };

          xhr.upload.onload = () => {
            setUploadProgress({
              fileName: file.name,
              progress: 95,
              stage: "processing",
            });
          };

          xhr.onerror = () => {
            reject(new Error("Failed to upload document."));
          };

          xhr.onload = () => {
            const responseText = xhr.responseText || "{}";
            const data = JSON.parse(responseText) as {
              error?: string;
              item?: KnowledgeDocumentItem;
            };

            if (xhr.status < 200 || xhr.status >= 300 || !data.item) {
              reject(new Error(data.error ?? "Failed to upload document."));
              return;
            }

            resolve(data.item);
          };

          xhr.send(formData);
        }
      );

      setDocuments((currentDocuments) => {
        const nextDocuments = currentDocuments.filter(
          (document) => document.id !== uploadedDocument.id
        );

        return [uploadedDocument, ...nextDocuments];
      });
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload document."
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      event.target.value = "";
    }
  }

  function handleDownload(documentId: string) {
    window.location.href = `/api/knowledge/documents/${documentId}/download`;
  }

  async function handleDelete(document: KnowledgeDocumentItem) {
    setDeletingDocumentId(document.id);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/knowledge/documents/${document.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete document.");
      }

      setDocuments((currentDocuments) =>
        currentDocuments.filter(
          (currentDocument) => currentDocument.id !== document.id
        )
      );
      setPendingDeleteDocument(null);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete document."
      );
    } finally {
      setDeletingDocumentId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--ui-ambient-1),transparent_24%),radial-gradient(circle_at_82%_18%,var(--ui-ambient-2),transparent_20%),linear-gradient(180deg,var(--ui-bg-soft),var(--ui-bg))] px-4 py-8 text-[var(--ui-text)] sm:px-6 lg:px-8">
      <Dialog
        open={pendingDeleteDocument !== null}
        onOpenChange={(open) => {
          if (!open && deletingDocumentId === null) {
            setPendingDeleteDocument(null);
          }
        }}
      >
        <DialogContent className="rounded-[1.5rem] border border-[var(--ui-border-soft)] bg-[var(--ui-surface)]">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              {pendingDeleteDocument
                ? `This will permanently remove ${pendingDeleteDocument.fileName}, its original file, and all indexed chunks from your private knowledge base.`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDeleteDocument(null)}
              disabled={deletingDocumentId !== null}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                pendingDeleteDocument
                  ? void handleDelete(pendingDeleteDocument)
                  : undefined
              }
              disabled={
                pendingDeleteDocument === null || deletingDocumentId !== null
              }
            >
              {deletingDocumentId !== null ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-[var(--ui-border-soft)] bg-[color:rgba(255,255,255,0.55)] p-5 shadow-[0_20px_60px_var(--ui-shadow)] backdrop-blur-xl dark:bg-[var(--ui-surface)]/90 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[var(--ui-text-faint)] transition hover:text-[var(--ui-text)]"
            >
              <ArrowLeft className="size-4" />
              Back to chat
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-[var(--ui-text-faint)]">
                Private Knowledge Base
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Upload, manage, and search your own documents
              </h1>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--ui-border-soft)] bg-[var(--ui-surface)] px-4 py-3 text-sm text-[var(--ui-text-muted)] shadow-sm">
            {userEmail}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <Card className="rounded-[1.75rem] border border-[var(--ui-border-soft)] bg-[color:rgba(255,255,255,0.56)] shadow-[0_18px_50px_var(--ui-shadow)] backdrop-blur-xl dark:bg-[var(--ui-surface)]/92">
            <CardHeader>
              <CardTitle>Upload document</CardTitle>
              <CardDescription>
                Supported formats: PDF, Markdown, TXT. Uploaded files stay
                private to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.md,.markdown,.txt,text/plain,text/markdown,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="rounded-[1.5rem] border border-dashed border-[var(--ui-border)] bg-[var(--ui-surface)]/80 p-5">
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-[var(--ui-text-muted)]">
                    We chunk, embed, and store vectors in your private Supabase
                    pgvector index after upload.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="rounded-xl"
                    >
                      {isUploading ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      {isUploading ? "Uploading..." : "Choose document"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void loadDocuments()}
                      disabled={isLoading}
                      className="rounded-xl"
                    >
                      <RefreshCw
                        className={`size-4 ${isLoading ? "animate-spin" : ""}`}
                      />
                      Refresh list
                    </Button>
                  </div>
                </div>
              </div>
              {uploadProgress ? (
                <div className="rounded-[1.5rem] border border-[var(--ui-border-soft)] bg-[var(--ui-surface)]/85 px-4 py-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {uploadProgress.fileName}
                      </p>
                      <p className="text-[var(--ui-text-muted)]">
                        {uploadProgress.stage === "uploading"
                          ? "Uploading file..."
                          : "Processing document, chunking, and generating embeddings..."}
                      </p>
                    </div>
                    <div className="shrink-0 text-sm font-medium text-[var(--ui-accent)]">
                      {uploadProgress.progress}%
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--ui-bg-soft)]">
                    <div
                      className="h-full rounded-full bg-[var(--ui-accent)] transition-[width] duration-300"
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                </div>
              ) : null}
              {errorMessage ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                  {errorMessage}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border border-[var(--ui-border-soft)] bg-[color:rgba(255,255,255,0.56)] shadow-[0_18px_50px_var(--ui-shadow)] backdrop-blur-xl dark:bg-[var(--ui-surface)]/92">
            <CardHeader>
              <CardTitle>Your documents</CardTitle>
              <CardDescription>
                Only you can see, download, and search these files.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="flex min-h-40 items-center justify-center rounded-[1.5rem] border border-[var(--ui-border-soft)] bg-[var(--ui-surface)]/80 text-sm text-[var(--ui-text-muted)]">
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Loading documents...
                </div>
              ) : documents.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-[var(--ui-border-soft)] bg-[var(--ui-surface)]/80 px-6 text-center">
                  <FileText className="size-8 text-[var(--ui-accent)]" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">No documents yet</p>
                    <p className="text-sm text-[var(--ui-text-muted)]">
                      Upload your first file to start retrieval-augmented chat.
                    </p>
                  </div>
                </div>
              ) : (
                documents.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-[1.5rem] border border-[var(--ui-border-soft)] bg-[var(--ui-surface)]/85 px-4 py-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 shrink-0 text-[var(--ui-accent)]" />
                          <p className="truncate font-medium">
                            {document.fileName}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-[var(--ui-text-faint)]">
                          <span>{formatFileSize(document.fileSize)}</span>
                          <span>{document.mimeType ?? "Unknown type"}</span>
                          <span>{document.chunkCount} chunks</span>
                          <span>
                            {new Date(document.updatedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="inline-flex rounded-full border border-[var(--ui-border-soft)] bg-[var(--ui-bg-soft)] px-2.5 py-1 text-xs font-medium text-[var(--ui-text-muted)]">
                          {formatStatus(document.status)}
                        </div>
                        {document.errorMessage ? (
                          <p className="text-sm text-rose-600 dark:text-rose-300">
                            {document.errorMessage}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDownload(document.id)}
                          disabled={document.status !== "READY"}
                          className="rounded-xl"
                        >
                          <Download className="size-4" />
                          Download
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => setPendingDeleteDocument(document)}
                          disabled={deletingDocumentId === document.id}
                          className="rounded-xl"
                        >
                          {deletingDocumentId === document.id ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
