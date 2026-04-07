"use client";

export interface ConversationItem {
  id: string;
  title: string;
  preview: string;
  dateGroup: "今天" | "昨天" | "更早";
  sortOrder: number;
  updatedAt: string;
}

export interface PreviewMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}
