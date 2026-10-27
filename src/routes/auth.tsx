import { useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { lovable } from "@/integrations/lovable/index";
import { POST_AUTH_REDIRECT_KEY, sanitizeRedirectPath } from "@/lib/auth-redirect";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Orbit" },
      {
        name: "description",
        content: "Sign in to Orbit to list your crypto project before launch day.",
      },
      { property: "og:title", content: "Sign in — Orbit" },
      { property: "og:description", content: "Sign in to Orbit to list your crypto project." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

function GoogleMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-8.6z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.3 1.2-3.3 0-6.1-2.2-7.1-5.2L1 17.1C3 21.1 7.2 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M4.9 14.2c-.3-.8-.4-1.6-.4-2.2s.2-1.5.4-2.2L1.1 6.8C.4 8.3 0 10.1 0 12s.4 3.7 1.1 5.2l3.8-3z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c1.9 0 3.2.8 3.9 1.5l3.2-3.1C17.9 1.2 15.2 0 12 0 7.2 0 3 2.9 1 6.8l3.8 3c1-3 3.9-5.1 7.2-5.1z"
      />
    </svg>
  );
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const session = useSession();
  const router = useRouter();
  const target = sanitizeRedirectPath(redirect);

  useEffect(() => {
    if (!session) return;
    router.history.push(target);
  }, [session, router, target]);

  async function signIn(provider: "google" | "lovable") {
    try {
      sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, target);
    } catch {
      // storage unavailable — fall back to landing on home
    }

    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });

    if (result.error) {
      try {
        sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
      } catch {
        // ignore
      }
      console.error("Sign-in failed:", result.error);
      return;
    }

    if (result.redirected) return;
    // Popup/web_message flow: the session is already set.
    router.history.push(target);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-xl border border-border/80 bg-card p-8 text-center shadow-sm">
        <a href="/" className="font-display text-lg font-semibold tracking-tight text-foreground">
          orbit<span className="text-muted-foreground">.</span>
        </a>
        <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground">
          Sign in to Orbit
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          List your project, manage your listing, and follow launches.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full font-medium"
            onClick={() => signIn("google")}
          >
            <GoogleMark />
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full font-medium"
            onClick={() => signIn("lovable")}
          >
            Continue with Lovable
          </Button>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          By continuing you agree to keep listings honest, on-topic, and yours to maintain.
        </p>
      </div>
    </div>
  );
}
