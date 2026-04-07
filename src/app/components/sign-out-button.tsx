"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

interface SignOutButtonProps {
  collapsed?: boolean;
}

/**
 * 退出当前登录会话并返回登录页。
 */
export default function SignOutButton({
  collapsed = false,
}: SignOutButtonProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);

  /**
   * 调用 Supabase 退出接口并刷新页面状态。
   */
  async function handleSignOut() {
    setLoading(true);

    const { error } = await supabase.auth.signOut();

    if (!error) {
      router.replace("/login");
      router.refresh();
      return;
    }

    setLoading(false);
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      disabled={loading}
      aria-label="退出登录"
      className={cn(
        "h-11 rounded-2xl border-[#eaded8] bg-white/84 text-[#6f5c55] shadow-sm hover:bg-[#fdf8f5] hover:text-[#7f6259]",
        collapsed ? "w-11 px-0" : "w-full justify-start gap-2 px-4"
      )}
    >
      <LogOut className="size-4 shrink-0" />
      {collapsed ? null : <span>{loading ? "退出中..." : "退出登录"}</span>}
    </Button>
  );
}
