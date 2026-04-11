-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "documents"
ADD COLUMN "error_message" TEXT,
ADD COLUMN "file_name" VARCHAR(255),
ADD COLUMN "file_size" INTEGER,
ADD COLUMN "mime_type" VARCHAR(120),
ADD COLUMN "status" "DocumentStatus" NOT NULL DEFAULT 'PROCESSING';

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(1536),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_chunks_document_id_chunk_index_key" ON "document_chunks"("document_id", "chunk_index");
CREATE INDEX "document_chunks_document_id_idx" ON "document_chunks"("document_id");
CREATE INDEX "document_chunks_user_id_document_id_idx" ON "document_chunks"("user_id", "document_id");
CREATE INDEX "documents_user_id_status_updated_at_idx" ON "documents"("user_id", "status", "updated_at" DESC);

-- AddForeignKey
ALTER TABLE "document_chunks"
ADD CONSTRAINT "document_chunks_document_id_fkey"
FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
