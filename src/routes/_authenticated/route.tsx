import { useEffect } from "react";
import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { sanitizeRedirectPath } from "@/lib/auth-redirect";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const target = location.pathname + (location.searchStr || "");
      throw redirect({ to: "/auth", search: { redirect: target } });
    }
  },
  component: () => <Outlet />,
});

// Reference useEffect to keep the import used by the gate's client-only context.
void useEffect;
