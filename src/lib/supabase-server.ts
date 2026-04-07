import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 创建服务端 Supabase Client，并将会话写回当前请求的 cookie。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // 在 Server Component 中可能无法直接写 cookie，交给 proxy 刷新即可。
          }
        },
      },
    }
  );
}

/**
 * 获取当前登录用户，未登录时返回 null。
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * 兼容旧命名，避免现有引用失效。
 */
export async function getCurrentLoginUser() {
  return getCurrentUser();
}
