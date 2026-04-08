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
    <div className="mt-6 shrink-0 border-t border-[var(--ui-border-soft)] pt-4">
      <AnimatePresence initial={false} mode="wait">
        {!isCollapsed ? (
          <motion.div
            key="sidebar-account"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
            className="mb-3 rounded-3xl border border-[var(--ui-border-soft)] bg-[linear-gradient(180deg,var(--ui-surface),color-mix(in_srgb,var(--ui-surface-muted)_72%,transparent))] p-4 shadow-[0_14px_34px_var(--ui-shadow)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--ui-border)] bg-[linear-gradient(180deg,var(--ui-surface),var(--ui-surface-muted))] text-sm font-semibold text-[var(--ui-accent-strong)] shadow-sm">
                {avatarLabel}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--ui-text)]">
                  {displayName}
                </p>
                <p
                  title={userEmail}
                  className="truncate text-xs text-[var(--ui-text-faint)]"
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
