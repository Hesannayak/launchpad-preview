import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`font-display text-lg font-semibold tracking-tight text-foreground ${className ?? ""}`}
    >
      orbit<span className="text-muted-foreground">.</span>
    </Link>
  );
}

export function SiteHeader() {
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = session?.user ?? null;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Wordmark />
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm" className="font-medium">
              <Link to="/submit" search={{}}>
                List your project
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="font-medium">
              <Link to="/auth" search={{ redirect: "/submit" }}>
                List your project
              </Link>
            </Button>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account"
                  className="flex size-8 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground transition-colors hover:bg-accent"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" size="sm" className="font-medium">
              <Link to="/auth" search={{ redirect: undefined }}>
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70 py-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 text-sm text-muted-foreground">
        <span>
          orbit — crypto, before it launches.
        </span>
        <span className="hidden sm:inline">© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
