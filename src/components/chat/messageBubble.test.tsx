import { fireEvent, render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";

import MessageBubble from "@/components/chat/messageBubble";

const baseUserMessage = {
  id: "user-1",
  role: "user",
  parts: [
    {
      type: "text",
      text: "测试消息",
    },
  ],
} as UIMessage;

describe("MessageBubble", () => {
  it("renders failure bubble text", () => {
    render(<MessageBubble isFailure failureText="请求失败，可重试" />);

    expect(screen.getByText("请求失败，可重试")).toBeInTheDocument();
  });

  it("renders retry and edit actions for the last user message", () => {
    render(<MessageBubble message={baseUserMessage} canEdit canRetry />);

    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("supports inline editing for the last user message", () => {
    const handleEditChange = jest.fn();
    const handleEditCancel = jest.fn();
    const handleEditSend = jest.fn();

    render(
      <MessageBubble
        message={baseUserMessage}
        editingValue="原始内容"
        isEditing
        onEditCancel={handleEditCancel}
        onEditChange={handleEditChange}
        onEditSend={handleEditSend}
      />
    );

    const textarea = screen.getByRole("textbox");

    fireEvent.change(textarea, {
      target: { value: "修改后的内容" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(handleEditChange).toHaveBeenCalledWith("修改后的内容");
    expect(handleEditCancel).toHaveBeenCalledTimes(1);
    expect(handleEditSend).toHaveBeenCalledTimes(1);
  });
});
