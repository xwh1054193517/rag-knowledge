import type { UIMessage } from "ai";

import type {
  ConversationDateGroup,
  ConversationItem,
} from "@/components/chat/types";
import { prisma } from "@/lib/prisma";

interface ListUserChatsOptions {
  cursor?: string;
  limit: number;
}

interface ListUserChatsResult {
  items: ConversationItem[];
  nextCursor: string | null;
  total: number;
}

interface ChatDetailResult {
  id: string;
  title: string;
  messages: UIMessage[];
}

type PersistedMessageRole = "USER" | "ASSISTANT";

interface PersistedUserMessageRecord {
  id: string;
  content: string;
  createdAt: Date;
}

/**
 * 根据更新时间计算会话分组。
 */
function getConversationDateGroup(updatedAt: Date): ConversationDateGroup {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);

  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  if (updatedAt >= todayStart) {
    return "今天";
  }

  if (updatedAt >= yesterdayStart) {
    return "昨天";
  }

  return "更早";
}

/**
 * 格式化会话更新时间文案。
 */
function formatConversationUpdatedAt(updatedAt: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(updatedAt);
}

/**
 * 截断首条消息作为会话标题。
 */
function truncateConversationTitle(title: string): string {
  return title.length > 80 ? `${title.slice(0, 80)}...` : title;
}

/**
 * 将数据库消息转换为前端 UIMessage。
 */
function toUIMessage(message: {
  id: string;
  role: PersistedMessageRole;
  content: string;
}): UIMessage {
  return {
    id: message.id,
    role: message.role === "USER" ? "user" : "assistant",
    parts: [
      {
        type: "text",
        text: message.content,
      },
    ],
  };
}

/**
 * 查询当前用户的会话列表。
 * SQL:
 * SELECT c.*, m.content
 * FROM conversations c
 * LEFT JOIN LATERAL (
 *   SELECT content
 *   FROM messages
 *   WHERE conversation_id = c.id
 *   ORDER BY created_at DESC
 *   LIMIT 1
 * ) m ON true
 * WHERE c.user_id = $1
 * ORDER BY c.updated_at DESC, c.id DESC
 * LIMIT $2 OFFSET $3;
 * 业务解释:
 * 1. 先按 user_id 过滤，只返回当前用户自己的会话。
 * 2. 每条会话额外取最新一条消息内容，作为侧边栏 preview。
 * 3. 按 updated_at 倒序排列，让最近活跃的会话排在最前面。
 * 4. 多取一条用于判断是否还有下一页，支持滚动加载更多。
 */
export async function listUserChats(
  userId: string,
  options: ListUserChatsOptions
): Promise<ListUserChatsResult> {
  const { cursor, limit } = options;
  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor
      ? {
          skip: 1,
          cursor: {
            id: cursor,
          },
        }
      : {}),
  });

  const hasMore = conversations.length > limit;

  return {
    items: conversations.slice(0, limit).map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      preview: conversation.messages[0]?.content ?? "等待输入第一条消息。",
      dateGroup: getConversationDateGroup(conversation.updatedAt),
      sortOrder: -conversation.updatedAt.getTime(),
      updatedAt: formatConversationUpdatedAt(conversation.updatedAt),
    })),
    nextCursor: hasMore ? (conversations[limit]?.id ?? null) : null,
  };
}

/**
 * 创建用户会话。
 * SQL:
 * INSERT INTO conversations (user_id, title)
 * VALUES ($1, $2)
 * RETURNING *;
 * 业务解释:
 * 1. 为当前用户创建一条新的会话记录。
 * 2. 会话标题通常取第一条用户消息的截断结果。
 * 3. 此时消息表还没有记录，前端先展示空会话壳子。
 */
export async function createUserChat(
  userId: string,
  title: string
): Promise<ConversationItem> {
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: truncateConversationTitle(title),
    },
  });

  return {
    id: conversation.id,
    title: conversation.title,
    preview: "等待输入第一条消息。",
    dateGroup: getConversationDateGroup(conversation.updatedAt),
    sortOrder: -conversation.updatedAt.getTime(),
    updatedAt: formatConversationUpdatedAt(conversation.updatedAt),
  };
}

/**
 * 根据用户和会话 ID 查询会话详情。
 * SQL:
 * SELECT c.*, m.*
 * FROM conversations c
 * LEFT JOIN messages m ON m.conversation_id = c.id
 * WHERE c.id = $1 AND c.user_id = $2
 * ORDER BY m.created_at ASC;
 * 业务解释:
 * 1. 先校验这条会话属于当前用户，避免越权读取。
 * 2. 再把该会话下的所有消息按创建时间正序取出。
 * 3. 返回结果给聊天区，用于完整渲染一段历史对话。
 */
export async function getUserChatDetail(
  userId: string,
  conversationId: string
): Promise<ChatDetailResult | null> {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  return {
    id: conversation.id,
    title: conversation.title,
    messages: conversation.messages.map(toUIMessage),
  };
}

/**
 * 校验用户是否拥有指定会话。
 * SQL:
 * SELECT id
 * FROM conversations
 * WHERE id = $1 AND user_id = $2
 * LIMIT 1;
 * 业务解释:
 * 1. 这是一个轻量级归属校验，只关心“有没有权限”。
 * 2. 适合在删除会话、继续对话、写入消息前先做 ownership check。
 * 3. 只查 id，避免为了权限判断多读不必要的数据。
 */
export async function findUserChat(
  userId: string,
  conversationId: string
): Promise<{ id: string } | null> {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    select: {
      id: true,
    },
  });
}

/**
 * 删除用户会话。
 * SQL:
 * DELETE FROM conversations
 * WHERE id = $1 AND user_id = $2;
 * 业务解释:
 * 1. 只有当前用户自己的会话可以删除。
 * 2. 删除 conversations 记录后，messages 会因为外键级联一并删除。
 * 3. 这样能保证会话和消息不会留下孤儿数据。
 */
export async function deleteUserChat(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const conversation = await findUserChat(userId, conversationId);

  if (!conversation) {
    return false;
  }

  await prisma.conversation.delete({
    where: {
      id: conversation.id,
    },
  });

  return true;
}

/**
 * 获取已有会话，若不存在则为用户创建新会话。
 * SQL:
 * SELECT id FROM conversations WHERE id = $1 AND user_id = $2 LIMIT 1;
 * INSERT INTO conversations (user_id, title) VALUES ($2, $3) RETURNING id;
 * 业务解释:
 * 1. 如果前端已经传了 conversationId，就先确认它确实属于当前用户。
 * 2. 如果没有传 conversationId，说明这是一次新的聊天，需要自动建会话。
 * 3. 这样 runChat 路由就能同时兼容“新对话”和“继续已有会话”两种场景。
 */
export async function getOrCreateUserChat(
  userId: string,
  conversationId: string | undefined,
  title: string
): Promise<string | null> {
  if (conversationId) {
    const conversation = await findUserChat(userId, conversationId);
    return conversation?.id ?? null;
  }

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: truncateConversationTitle(title),
    },
    select: {
      id: true,
    },
  });

  return conversation.id;
}

/**
 * 追加一条会话消息。
 * SQL:
 * INSERT INTO messages (conversation_id, role, content, tool_calls)
 * VALUES ($1, $2, $3, $4);
 * 业务解释:
 * 1. 统一负责把用户消息或助手消息写入 messages 表。
 * 2. role 用来区分 USER / ASSISTANT。
 * 3. tool_calls 预留给后续工具调用结果或来源信息的落库。
 */
export async function appendChatMessage(options: {
  conversationId: string;
  role: PersistedMessageRole;
  content: string;
  toolCalls?: unknown;
}) {
  const { conversationId, role, content, toolCalls } = options;

  return prisma.message.create({
    data: {
      conversationId,
      role,
      content,
      ...(toolCalls !== undefined ? { toolCalls } : {}),
    },
  });
}

/**
 * 更新会话最后活跃时间。
 * SQL:
 * UPDATE conversations
 * SET updated_at = NOW()
 * WHERE id = $1;
 * 业务解释:
 * 1. 每次有新消息写入后，都同步刷新会话的 updated_at。
 * 2. 这样侧边栏按更新时间排序时，这条会话就会自动顶到前面。
 * 3. 会话列表分组和分页也会基于这个时间字段工作。
 */
export async function touchChat(conversationId: string) {
  return prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      updatedAt: new Date(),
    },
  });
}
/**
 * SQL:
 * SELECT COUNT(*) FROM conversations WHERE user_id = $1;
 *
 * 业务解释:
 * 获取当前用户的会话总数，用于侧边栏头部统计，不受分页 limit 影响。
 */
export async function countUserChats(userId: string): Promise<number> {
  return prisma.conversation.count({
    where: {
      userId,
    },
  });
}

/**
 * SQL:
 * BEGIN;
 * SELECT 最后一条 USER 消息;
 * UPDATE 这条 USER 消息的 content;
 * DELETE 这条 USER 消息之后的 ASSISTANT 消息;
 * UPDATE conversations SET updated_at = NOW();
 * COMMIT;
 *
 * 业务解释:
 * 将“最后一条用户消息 + 其后的 assistant 回复”视为一个可替换单元。
 * 重新发送或编辑重发时，统一走这个事务来保证数据一致性。
 */
export async function rerunLastUserMessage(options: {
  userId: string;
  conversationId: string;
  content: string;
}) {
  const { userId, conversationId, content } = options;

  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      select: {
        id: true,
        messages: {
          where: {
            role: "USER",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    const lastUserMessage = conversation?.messages[0];

    if (!lastUserMessage) {
      return null;
    }

    await tx.message.update({
      where: {
        id: lastUserMessage.id,
      },
      data: {
        content,
      },
    });

    await tx.message.deleteMany({
      where: {
        conversationId,
        role: "ASSISTANT",
        createdAt: {
          gt: lastUserMessage.createdAt,
        },
      },
    });

    await tx.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return {
      id: lastUserMessage.id,
      createdAt: lastUserMessage.createdAt,
    };
  });
}
