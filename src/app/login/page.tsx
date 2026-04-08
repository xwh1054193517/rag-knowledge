"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  BrainCircuit,
  Boxes,
  Loader2,
  Orbit,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

interface FeatureCard {
  title: string;
  description: string;
  icon: typeof Bot;
  iconClassName: string;
  shadowClassName: string;
}

const featureCards: FeatureCard[] = [
  {
    title: "Agent 对话",
    description:
      "基于 LangChain 的多轮对话与工具调用能力，适合继续扩展成完整的 AI 工作流。",
    icon: Bot,
    iconClassName: "text-[var(--ui-accent)]",
    shadowClassName: "shadow-[0_18px_60px_var(--ui-shadow)]",
  },
  {
    title: "安全会话",
    description:
      "邮箱密码与 Google OAuth 共用一套认证链路，页面和接口都能统一校验登录状态。",
    icon: ShieldCheck,
    iconClassName: "text-[var(--ui-text-faint)]",
    shadowClassName: "shadow-[0_18px_60px_var(--ui-shadow)]",
  },
  {
    title: "Next 技术栈",
    description:
      "基于 Next.js App Router、React 与 Tailwind，方便后续持续扩展页面和交互体验。",
    icon: Boxes,
    iconClassName: "text-[var(--ui-text-soft)]",
    shadowClassName: "shadow-[0_18px_60px_var(--ui-shadow)]",
  },
  {
    title: "Supabase",
    description:
      "统一承载认证、数据库与用户隔离能力，让 AI 应用更容易落地和长期维护。",
    icon: BrainCircuit,
    iconClassName: "text-[var(--ui-accent-strong)]",
    shadowClassName: "shadow-[0_18px_60px_var(--ui-shadow)]",
  },
];

/**
 * 生成登录页背景粒子数据。
 */
function createParticles(): Particle[] {
  return Array.from({ length: 30 }, (_, index) => ({
    id: index,
    x: (index * 17.3) % 100,
    y: (index * 11.7) % 100,
    size: (index % 4) + 1.5,
    speed: 0.08 + (index % 5) * 0.06,
    opacity: 0.18 + (index % 4) * 0.08,
  }));
}

/**
 * 登录与注册页。
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const next = searchParams.get("next") || "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>(() =>
    createParticles()
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session &&
        (event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "INITIAL_SESSION")
      ) {
        router.replace(next);
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [next, router, supabase]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setParticles((currentParticles) =>
        currentParticles.map((particle) => ({
          ...particle,
          y: (particle.y - particle.speed + 100) % 100,
        }))
      );
    }, 36);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  /**
   * 处理邮箱登录或注册。
   */
  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
              : undefined,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage("注册成功，请前往邮箱完成验证后再登录。");
        setMode("login");
      }

      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.replace(next);
    router.refresh();
    setLoading(false);
  }

  /**
   * 处理 Google OAuth 登录。
   */
  async function handleGoogleAuth() {
    setGoogleLoading(true);
    setError(null);
    setMessage(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : undefined;

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (googleError) {
      setError(googleError.message);
      setGoogleLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--ui-ambient-1),transparent_28%),radial-gradient(circle_at_82%_18%,var(--ui-ambient-2),transparent_24%),linear-gradient(180deg,var(--ui-bg-soft),var(--ui-bg))]" />
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-[var(--ui-border-strong)]"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              boxShadow: "0 0 14px var(--ui-ambient-2)",
            }}
          />
        ))}
        <div className="absolute left-[-4rem] top-10 h-64 w-64 rounded-full bg-[var(--ui-ambient-1)] blur-3xl" />
        <div className="absolute right-[-3rem] top-20 h-80 w-80 rounded-full bg-[var(--ui-ambient-2)] blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--ui-ambient-3)] blur-3xl" />
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--ui-border-strong)] to-transparent" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="flex flex-col justify-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.06)] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--ui-accent)] shadow-sm backdrop-blur-sm dark:bg-[var(--ui-surface)]">
              <Orbit className="size-3.5" />
              AI Knowledge Workspace
            </div>

            <div className="mt-6 space-y-3">
              <h1 className="text-4xl font-semibold leading-tight text-[var(--ui-text)] sm:text-5xl">
                <span className="block">知识检索 RAG Retriever</span>
                <span className="block">联网搜索 Web Search</span>
                <span className="block">智能助手 AI Assistant</span>
              </h1>
              <p className="text-xl font-medium uppercase tracking-[0.18em] text-[var(--ui-text-faint)]">
                All in Workspace
              </p>
            </div>

            <p className="mt-6 max-w-xl text-sm leading-7 text-[var(--ui-text-soft)] sm:text-base">
              上传知识库，组织检索、搜索与对话能力，在一个更适合 AI
              工作流的入口里完成认证与使用。
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {featureCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className={cn(
                      "rounded-3xl border border-[var(--ui-border-soft)] bg-[color:rgba(255,255,255,0.06)] p-5 backdrop-blur-md dark:bg-[var(--ui-surface)]",
                      card.shadowClassName
                    )}
                  >
                    <Icon className={cn("mb-4 size-5", card.iconClassName)} />
                    <h2 className="text-base font-medium text-[var(--ui-text)]">
                      {card.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--ui-text-soft)]">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="lg:justify-self-end">
          <div className="w-full rounded-[2rem] border border-[var(--ui-border-soft)] bg-[linear-gradient(180deg,var(--ui-surface),color-mix(in_srgb,var(--ui-surface-muted)_74%,transparent))] p-6 shadow-[0_30px_100px_var(--ui-shadow)] backdrop-blur-xl sm:p-8 lg:w-[28rem]">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--ui-accent)]">
                Account
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--ui-text)]">
                {mode === "login" ? "登录账户" : "创建账户"}
              </h2>
            </div>

            <div className="relative mt-6 grid grid-cols-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] p-1">
              <div
                className={cn(
                  "absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-white/95 shadow-sm transition-transform duration-300 ease-out",
                  mode === "login" ? "translate-x-0" : "translate-x-full"
                )}
              />
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setMessage(null);
                }}
                className={cn(
                  "relative z-10 rounded-full px-4 py-2 text-sm transition-colors duration-300",
                  mode === "login"
                    ? "text-[var(--ui-accent-strong)]"
                    : "text-[var(--ui-text-faint)] hover:text-[var(--ui-text)]"
                )}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setMessage(null);
                }}
                className={cn(
                  "relative z-10 rounded-full px-4 py-2 text-sm transition-colors duration-300",
                  mode === "signup"
                    ? "text-[var(--ui-accent-strong)]"
                    : "text-[var(--ui-text-faint)] hover:text-[var(--ui-text)]"
                )}
              >
                注册
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleEmailAuth}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[var(--ui-text)]">
                  邮箱
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-11 border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.06)] text-[var(--ui-text)] placeholder:text-[var(--ui-text-faint)] shadow-sm dark:bg-[var(--ui-surface)]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[var(--ui-text)]">
                  密码
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    mode === "login" ? "输入你的密码" : "至少 6 位密码"
                  }
                  className="h-11 border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.06)] text-[var(--ui-text)] placeholder:text-[var(--ui-text-faint)] shadow-sm dark:bg-[var(--ui-surface)]"
                  minLength={6}
                  required
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-300/50 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-2xl border border-emerald-300/50 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={loading || googleLoading}
                className="h-11 w-full border border-[var(--ui-border)] bg-[linear-gradient(135deg,var(--ui-surface-muted),var(--ui-surface-strong))] text-[var(--ui-accent-strong)] shadow-[0_10px_24px_var(--ui-shadow)] hover:bg-[linear-gradient(135deg,var(--ui-surface),var(--ui-surface-strong))]"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "login"
                  ? loading
                    ? "登录中..."
                    : "登录"
                  : loading
                    ? "注册中..."
                    : "注册"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--ui-border)]" />
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--ui-text-faint)]">
                Or continue with
              </span>
              <div className="h-px flex-1 bg-[var(--ui-border)]" />
            </div>

            <Button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading || googleLoading}
              className="h-11 w-full border border-[var(--ui-border)] bg-[color:rgba(255,255,255,0.06)] text-[var(--ui-text-soft)] shadow-sm hover:bg-[var(--ui-surface)] dark:bg-[var(--ui-surface)]"
            >
              {googleLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              使用 Google 登录
            </Button>

            <div className="mt-6 rounded-2xl border border-[var(--ui-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ui-surface-muted)_92%,transparent),color-mix(in_srgb,var(--ui-surface-strong)_72%,transparent))] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--ui-accent-strong)]">
                <Sparkles className="size-4 text-[var(--ui-accent)]" />
                AI-ready workspace
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-text-soft)]">
                浅色基调配合粒子与柔和光晕，让整个入口更像面向知识检索与智能助手的
                AI 产品首页。
              </p>
            </div>

            <p className="mt-6 text-center text-sm leading-6 text-[var(--ui-text-faint)]">
              {mode === "login"
                ? "还没有账号？切换到注册即可创建新账户。"
                : "已有账号？切换回登录即可继续使用。"}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
