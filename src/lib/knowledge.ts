// Node.js crypto 用于生成文档 hash 和随机 UUID。
import { createHash, randomUUID } from "node:crypto";
// Node.js path 用于处理文件名和扩展名。
import { basename, extname } from "node:path";

// OpenAI embeddings 客户端，用于生成向量。
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
// OpenRouter 聊天模型，用于查询重写。
import { ChatOpenRouter } from "@langchain/openrouter";
// LangChain 文本切分器，用于把长文档拆成 chunk。
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
// PDF 解析器，用于从 PDF 中抽取纯文本。
import { PDFParse } from "pdf-parse";

// Prisma 单例客户端。
import { prisma } from "@/lib/prisma";
// Supabase Storage 管理端客户端和 bucket 名解析函数。
import {
  getKnowledgeBucketName,
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

// 当前允许上传的 MIME 类型集合。
const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
]);

// 当前允许上传的文件扩展名集合。
const SUPPORTED_FILE_EXTENSIONS = new Set([".pdf", ".md", ".markdown", ".txt"]);
// 默认 embedding 模型名称。
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
// 默认检索返回条数。
const DEFAULT_MATCH_LIMIT = 5;
// 默认相似度阈值，低于该阈值的结果会被过滤掉。
const DEFAULT_SIMILARITY_THRESHOLD = 0.45;

// 向量入库前的 chunk 数据结构。
interface ChunkRecordInput {
  // 当前 chunk 的文本内容。
  content: string;
  // 当前 chunk 的向量。
  embedding: number[];
  // 当前 chunk 的附加元信息。
  metadata: Record<string, unknown>;
}

// 返回给知识库页面的文档列表项结构。
export interface KnowledgeDocumentItem {
  // 文档主键。
  id: string;
  // 原始文件名。
  fileName: string;
  // 文件大小。
  fileSize: number | null;
  // 文件 MIME 类型。
  mimeType: string | null;
  // 文档处理状态。
  status: "PROCESSING" | "READY" | "FAILED";
  // 处理失败时的错误信息。
  errorMessage: string | null;
  // 创建时间。
  createdAt: string;
  // 更新时间。
  updatedAt: string;
  // 当前文档共切分出的 chunk 数量。
  chunkCount: number;
}

// 单条知识库检索命中结果。
export interface KnowledgeSearchMatch {
  // chunk 主键。
  chunkId: string;
  // 所属文档主键。
  documentId: string;
  // 文件名。
  fileName: string;
  // chunk 下标。
  chunkIndex: number;
  // 供大模型内联引用的标签。
  citationLabel: string;
  // 供 UI 弹窗展示的短摘录。
  excerpt: string;
  // 完整 chunk 文本。
  content: string;
  // chunk 元数据。
  metadata: Record<string, unknown> | null;
  // 相似度分数。
  similarity: number;
}

// 知识库检索整体返回结构。
interface KnowledgeSearchResponse {
  // 原始查询。
  query: string;
  // 查询重写后的版本。
  rewrittenQuery: string;
  // 是否存在足够相关的结果。
  hasRelevantResults: boolean;
  // 本次检索采用的相似度阈值。
  threshold: number;
  // 给大模型的回答指导文案。
  answeringGuidance: string;
  // 检索命中列表。
  matches: KnowledgeSearchMatch[];
}

/**
 * 从 LangChain 聊天模型的 content 中提取纯文本。
 */
function getContentText(content: unknown): string {
  // 如果本来就是字符串，直接返回。
  if (typeof content === "string") {
    return content;
  }

  // 如果 content 是块数组，则把 text block 拼起来。
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        // 只提取 type === "text" 的块。
        if (
          item &&
          typeof item === "object" &&
          "type" in item &&
          item.type === "text" &&
          "text" in item &&
          typeof item.text === "string"
        ) {
          return item.text;
        }

        // 非文本块直接忽略。
        return "";
      })
      .join("")
      .trim();
  }

  // 其他未知结构一律回退为空字符串。
  return "";
}

/**
 * 创建 embedding 客户端。
 */
function createEmbeddingsClient() {
  // 优先使用 EMBEDDING_API_KEY，没有则回退到 OPENAI_API_KEY。
  const apiKey = process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY;

  // 没有 key 时直接抛错，避免后面静默失败。
  if (!apiKey) {
    throw new Error(
      "Missing EMBEDDING_API_KEY or OPENAI_API_KEY for knowledge embeddings."
    );
  }

  // 返回 OpenAI embeddings 客户端。
  return new OpenAIEmbeddings({
    apiKey,
    model: process.env.EMBEDDING_MODEL_NAME ?? DEFAULT_EMBEDDING_MODEL,
    dimensions: 1536,
    configuration: {
      baseURL:
        process.env.EMBEDDING_BASE_URL ??
        process.env.OPENAI_BASE_URL ??
        undefined,
    },
  });
}

/**
 * 创建查询重写模型。
 */
function createRewriteModel() {
  // 如果配置了 OpenRouter，就优先走 OpenRouter。
  if (process.env.OPENROUTER_API_KEY) {
    return new ChatOpenRouter({
      model: process.env.MODEL_NAME ?? "openrouter/free",
      temperature: 0,
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }

  // 否则尝试回退到 OpenAI。
  if (process.env.OPENAI_API_KEY) {
    return new ChatOpenAI({
      model: process.env.MODEL_NAME ?? "gpt-4o-mini",
      temperature: 0,
      apiKey: process.env.OPENAI_API_KEY,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL || undefined,
      },
    });
  }

  // 如果连模型 key 都没有，就返回 null。
  return null;
}

/**
 * 清洗文件名，避免生成危险路径。
 */
function getSafeFileName(fileName: string) {
  // 只保留 basename，并把特殊字符替换成下划线。
  return basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * 推导文件 MIME 类型。
 */
function getMimeType(file: File) {
  // 如果浏览器给出的 MIME 类型在白名单里，直接使用。
  if (file.type && SUPPORTED_MIME_TYPES.has(file.type)) {
    return file.type;
  }

  // 否则根据扩展名兜底。
  const extension = extname(file.name).toLowerCase();

  // PDF。
  if (extension === ".pdf") {
    return "application/pdf";
  }

  // TXT。
  if (extension === ".txt") {
    return "text/plain";
  }

  // Markdown。
  if (extension === ".md" || extension === ".markdown") {
    return "text/markdown";
  }

  // 最后兜底为浏览器原始值或通用二进制类型。
  return file.type || "application/octet-stream";
}

/**
 * 校验上传文件是否在支持范围内。
 */
function assertSupportedDocument(file: File) {
  // 取扩展名。
  const extension = extname(file.name).toLowerCase();
  // 推导 MIME 类型。
  const mimeType = getMimeType(file);

  // 扩展名和 MIME 都不命中白名单时，拒绝上传。
  if (
    !SUPPORTED_FILE_EXTENSIONS.has(extension) &&
    !SUPPORTED_MIME_TYPES.has(mimeType)
  ) {
    throw new Error("Only PDF, Markdown, and TXT files are supported.");
  }
}

/**
 * 把 number[] 转为 pgvector 可接受的字面量格式。
 */
function serializeVector(values: number[]) {
  // 例如 [0.1,0.2,0.3]
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

/**
 * 归一化文本片段，用于生成简洁 excerpt。
 */
function normalizeSnippet(content: string) {
  // 压缩连续空白，只保留单空格。
  return content.replace(/\s+/g, " ").trim();
}

/**
 * 构造 chunk 引用标签。
 */
function buildCitationLabel(fileName: string, chunkIndex: number) {
  // 例如 [handbook.pdf#chunk-2]
  return `[${fileName}#chunk-${chunkIndex + 1}]`;
}

/**
 * 把数据库文档对象格式化成前端列表项。
 */
function formatKnowledgeDocument(document: {
  id: string;
  fileName: string | null;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  status: "PROCESSING" | "READY" | "FAILED";
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { chunks: number };
}): KnowledgeDocumentItem {
  // 输出 UI 友好的对象。
  return {
    id: document.id,
    fileName: document.fileName ?? basename(document.filePath),
    fileSize: document.fileSize,
    mimeType: document.mimeType,
    status: document.status,
    errorMessage: document.errorMessage,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    chunkCount: document._count?.chunks ?? 0,
  };
}

/**
 * 从文档 buffer 中抽取纯文本。
 */
async function extractDocumentText(buffer: Buffer, mimeType: string) {
  // PDF 走 PDF 解析器。
  if (mimeType === "application/pdf") {
    // 初始化 PDF 解析实例。
    const parser = new PDFParse({ data: buffer });

    try {
      // 提取全文文本。
      const parsed = await parser.getText();
      return parsed.text.trim();
    } finally {
      // 无论成功失败都销毁解析器，避免资源泄漏。
      await parser.destroy();
    }
  }

  // 纯文本和 Markdown 直接按 UTF-8 解码。
  return buffer.toString("utf8").trim();
}

/**
 * 将长文档切分为多个检索 chunk。
 */
async function splitDocumentText(content: string) {
  // 配置 chunk size 和 overlap。
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 200,
  });

  // 返回切分结果。
  return splitter.splitText(content);
}

/**
 * 批量写入文档 chunk 和 embedding。
 */
async function insertDocumentChunks(
  documentId: string,
  userId: string,
  chunks: ChunkRecordInput[]
) {
  // 整个写入过程放进事务。
  await prisma.$transaction(async (tx) => {
    // 先清掉当前文档已有 chunk，避免重复写入。
    await tx.$executeRawUnsafe(
      `DELETE FROM "document_chunks" WHERE "document_id" = $1::uuid`,
      documentId
    );

    // 逐条写入 chunk。
    for (let index = 0; index < chunks.length; index += 1) {
      // 取当前 chunk。
      const chunk = chunks[index];

      // 使用原生 SQL 写入 vector 列。
      await tx.$executeRawUnsafe(
        `
          INSERT INTO "document_chunks"
            ("document_id", "user_id", "chunk_index", "content", "metadata", "embedding")
          VALUES
            ($1::uuid, $2::uuid, $3, $4, $5::jsonb, $6::vector)
        `,
        documentId,
        userId,
        index,
        chunk.content,
        JSON.stringify(chunk.metadata),
        serializeVector(chunk.embedding)
      );
    }
  });
}

/**
 * 列出当前用户的私有知识库文档。
 */
export async function listKnowledgeDocuments(userId: string) {
  // 查询当前用户的全部文档，并带上 chunk 数量。
  const documents = await prisma.document.findMany({
    where: {
      userId,
    },
    include: {
      _count: {
        select: {
          chunks: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  // 统一格式化为前端列表结构。
  return documents.map(formatKnowledgeDocument);
}

/**
 * 上传并入库一个知识库文档。
 */
export async function uploadKnowledgeDocument(userId: string, file: File) {
  // 先校验文件类型。
  assertSupportedDocument(file);

  // 读取浏览器 File 内容。
  const arrayBuffer = await file.arrayBuffer();
  // 转成 Node Buffer。
  const buffer = Buffer.from(arrayBuffer);
  // 计算 sha256 hash，用于用户级去重。
  const fileHash = createHash("sha256").update(buffer).digest("hex");
  // 查询当前用户是否已有相同文件。
  const existingDocument = await prisma.document.findUnique({
    where: {
      userId_fileHash: {
        userId,
        fileHash,
      },
    },
    include: {
      _count: {
        select: {
          chunks: true,
        },
      },
    },
  });

  // 如果已存在，直接返回，不重复入库。
  if (existingDocument) {
    return formatKnowledgeDocument(existingDocument);
  }

  // 推导 MIME 类型。
  const mimeType = getMimeType(file);
  // 生成文档主键。
  const documentId = randomUUID();
  // 清洗文件名。
  const safeFileName = getSafeFileName(file.name);
  // 组装 Storage 路径。
  const filePath = `${userId}/${documentId}/${safeFileName}`;
  // 获取 Supabase 管理端客户端。
  const supabaseAdmin = getSupabaseAdminClient();
  // 解析 bucket 名。
  const bucketName = getKnowledgeBucketName();

  // 先创建一条 processing 状态的文档记录。
  await prisma.document.create({
    data: {
      id: documentId,
      userId,
      filePath,
      fileHash,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      status: "PROCESSING",
    },
  });

  try {
    // 上传原始文件到 Supabase Storage。
    const uploadResult = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    // 上传失败时直接报错。
    if (uploadResult.error) {
      throw new Error(uploadResult.error.message);
    }

    // 抽取纯文本。
    const extractedText = await extractDocumentText(buffer, mimeType);

    // 抽取不到文本时视为失败。
    if (!extractedText.trim()) {
      throw new Error(
        "The uploaded document does not contain extractable text."
      );
    }

    // 切分文本。
    const textChunks = await splitDocumentText(extractedText);

    // 没切出 chunk 时视为失败。
    if (textChunks.length === 0) {
      throw new Error("The uploaded document could not be split into chunks.");
    }

    // 创建 embeddings 客户端。
    const embeddings = createEmbeddingsClient();
    // 批量生成向量。
    const vectors = await embeddings.embedDocuments(textChunks);

    // 组合 chunk 记录。
    const chunkRecords = textChunks.map((content, index) => ({
      content,
      embedding: vectors[index],
      metadata: {
        source: file.name,
        mimeType,
        chunkIndex: index,
      },
    }));

    // 写入 chunk 和向量。
    await insertDocumentChunks(documentId, userId, chunkRecords);

    // 把文档状态更新为 READY。
    const document = await prisma.document.update({
      where: {
        id: documentId,
      },
      data: {
        status: "READY",
        errorMessage: null,
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });

    // 返回最终文档信息。
    return formatKnowledgeDocument(document);
  } catch (error: unknown) {
    // 统一提取错误消息。
    const message =
      error instanceof Error ? error.message : "Failed to process document.";

    // 把文档标记为 FAILED，方便前端展示。
    await prisma.document.update({
      where: {
        id: documentId,
      },
      data: {
        status: "FAILED",
        errorMessage: message,
      },
    });

    // 向上抛出错误。
    throw new Error(message);
  }
}

/**
 * 查询当前用户可下载的文档元信息。
 */
export async function getKnowledgeDocumentForDownload(
  userId: string,
  documentId: string
) {
  // 只允许读取属于当前用户的文档。
  return prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
    },
    select: {
      id: true,
      fileName: true,
      filePath: true,
      mimeType: true,
      status: true,
    },
  });
}

/**
 * 下载当前用户的私有知识库原文件。
 */
export async function downloadKnowledgeDocument(
  userId: string,
  documentId: string
) {
  // 先做归属校验。
  const document = await getKnowledgeDocumentForDownload(userId, documentId);

  // 查不到直接返回 null。
  if (!document) {
    return null;
  }

  // 获取 Supabase 管理端客户端。
  const supabaseAdmin = getSupabaseAdminClient();
  // 获取 bucket 名。
  const bucketName = getKnowledgeBucketName();
  // 下载原始文件。
  const downloadResult = await supabaseAdmin.storage
    .from(bucketName)
    .download(document.filePath);

  // 下载失败时抛错。
  if (downloadResult.error) {
    throw new Error(downloadResult.error.message);
  }

  // 返回文件 blob 和文档信息。
  return {
    document,
    blob: downloadResult.data,
  };
}

/**
 * 删除当前用户的私有知识库文档。
 */
export async function deleteKnowledgeDocument(
  userId: string,
  documentId: string
) {
  // 先查当前用户是否拥有该文档。
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
    },
    select: {
      id: true,
      filePath: true,
    },
  });

  // 查不到返回 false。
  if (!document) {
    return false;
  }

  // 获取 Supabase 管理端客户端。
  const supabaseAdmin = getSupabaseAdminClient();
  // 获取 bucket 名。
  const bucketName = getKnowledgeBucketName();
  // 删除 Storage 中的原始文件。
  const removeResult = await supabaseAdmin.storage
    .from(bucketName)
    .remove([document.filePath]);

  // Storage 删除失败时抛错。
  if (removeResult.error) {
    throw new Error(removeResult.error.message);
  }

  // 删除数据库文档记录。chunk 会因外键级联一起删除。
  await prisma.document.delete({
    where: {
      id: document.id,
    },
  });

  // 返回删除成功。
  return true;
}

/**
 * 在向量检索前先对用户问题做查询重写。
 */
export async function rewriteKnowledgeQuery(query: string) {
  // 获取查询重写模型。
  const model = createRewriteModel();

  // 没有模型时直接回退原始 query。
  if (!model) {
    return query.trim();
  }

  try {
    // 让模型把原问题改写成更适合检索的短查询。
    const response = await model.invoke(
      [
        "Rewrite the user's question into a concise retrieval query for their private knowledge base.",
        "Keep important nouns, product names, filenames, and technical terms.",
        "Return only the rewritten query with no explanation.",
        `User question: ${query}`,
      ].join("\n")
    );
    // 提取模型返回的纯文本。
    const rewritten = getContentText(response.content).trim();

    // 有结果时返回改写后的 query，没有就回退原问题。
    return rewritten || query.trim();
  } catch {
    // 查询重写失败时不要阻塞主流程，直接回退原问题。
    return query.trim();
  }
}

/**
 * 在当前用户的私有知识库里做 pgvector 相似度检索。
 */
export async function searchKnowledgeBase(
  userId: string,
  query: string,
  options?: {
    limit?: number;
    similarityThreshold?: number;
  }
): Promise<KnowledgeSearchResponse> {
  // 创建 embeddings 客户端。
  const embeddings = createEmbeddingsClient();
  // 先做查询重写。
  const rewrittenQuery = await rewriteKnowledgeQuery(query);
  // 生成查询向量。
  const queryVector = await embeddings.embedQuery(rewrittenQuery);
  // 序列化为 pgvector 字面量。
  const vectorLiteral = serializeVector(queryVector);
  // 解析 limit。
  const limit = options?.limit ?? DEFAULT_MATCH_LIMIT;
  // 解析相似度阈值。
  const similarityThreshold =
    options?.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;

  // 执行原生 SQL 向量检索。
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      chunkId: string;
      documentId: string;
      fileName: string | null;
      chunkIndex: number;
      content: string;
      metadata: Record<string, unknown> | null;
      similarity: number | null;
    }>
  >(
    `
      SELECT
        dc.id AS "chunkId",
        dc.document_id AS "documentId",
        d.file_name AS "fileName",
        dc.chunk_index AS "chunkIndex",
        dc.content AS "content",
        dc.metadata AS "metadata",
        1 - (dc.embedding <=> '${vectorLiteral}'::vector) AS "similarity"
      FROM "document_chunks" dc
      INNER JOIN "documents" d
        ON d.id = dc.document_id
      WHERE dc.user_id = $1::uuid
        AND d.status = 'READY'
        AND dc.embedding IS NOT NULL
      ORDER BY dc.embedding <=> '${vectorLiteral}'::vector
      LIMIT $2
    `,
    userId,
    limit
  );

  // 格式化命中结果并按阈值过滤。
  const matches = rows
    .map((row) => ({
      chunkId: row.chunkId,
      documentId: row.documentId,
      fileName: row.fileName ?? "Untitled document",
      chunkIndex: row.chunkIndex,
      citationLabel: buildCitationLabel(
        row.fileName ?? "Untitled document",
        row.chunkIndex
      ),
      excerpt: normalizeSnippet(row.content).slice(0, 280),
      content: row.content,
      metadata: row.metadata,
      similarity: Number(row.similarity ?? 0),
    }))
    .filter((row) => row.similarity >= similarityThreshold);

  // 返回最终检索结果。
  return {
    query,
    rewrittenQuery,
    hasRelevantResults: matches.length > 0,
    threshold: similarityThreshold,
    answeringGuidance:
      "When you use these private knowledge results, cite them inline with the exact citationLabel, for example [handbook.pdf#chunk-2].",
    matches,
  };
}
