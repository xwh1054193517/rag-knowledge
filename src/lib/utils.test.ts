import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges tailwind classes and keeps the latest conflicting value", () => {
    expect(cn("px-2 py-1", "px-4", "text-sm")).toBe("py-1 px-4 text-sm");
  });

  it("ignores falsy values", () => {
    expect(cn("flex", false && "hidden", null, undefined, "items-center")).toBe(
      "flex items-center"
    );
  });
});
