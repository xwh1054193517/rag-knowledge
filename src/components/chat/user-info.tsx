"use client";

import { AnimatePresence, motion } from "framer-motion";

import SignOutButton from "@/app/components/sign-out-button";
import { cn } from "@/lib/utils";

interface UserInfoProps {
  isCollapsed: boolean;
  userEmail: string;
}

/**
 * 从邮箱中提取展示用用户名。
 */
function getDisplayName(email: string): string {
  const [localPart] = email.split("@");
  return localPart || "user";
}

/**
 * 根据邮箱生成头像占位字母。
 */
function getAvatarLabel(email: string): string {
  return getDisplayName(email).slice(0, 1).toUpperCase() || "U";
}

/**
 * 用户信息组件，负责展示用户名、邮箱和退出登录。
 */
export default function UserInfo({ isCollapsed, userEmail }: UserInfoProps) {
  const displayName = getDisplayName(userEmail);
  const avatarLabel = getAvatarLabel(userEmail);

  return (
    <div className="mt-6 shrink-0 border-t border-[#f0e5df] pt-4">
      <AnimatePresence initial={false} mode="wait">
        {!isCollapsed ? (
          <motion.div
            key="sidebar-account"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
            className="mb-3 rounded-3xl border border-[#f0e5df] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(251,245,241,0.82))] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#e6d5ce] bg-[linear-gradient(180deg,#f8efea,#f1e2db)] text-sm font-semibold text-[#8a665c] shadow-sm">
                {avatarLabel}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#6f5c55]">
                  {displayName}
                </p>
                <p
                  title={userEmail}
                  className="truncate text-xs text-[#9e857c]"
                >
                  {userEmail}
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className={cn(isCollapsed ? "flex justify-center" : "")}>
        <SignOutButton collapsed={isCollapsed} />
      </div>
    </div>
  );
}
