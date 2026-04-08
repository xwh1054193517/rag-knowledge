import type { UIMessage } from "ai";

export type ConversationDateGroup = "今天" | "昨天" | "更早";

export interface ConversationItem {
  id: string;
  title: string;
  preview: string;
  dateGroup: ConversationDateGroup;
  sortOrder: number;
  updatedAt: string;
}

export type ChatMessageItem = UIMessage;
