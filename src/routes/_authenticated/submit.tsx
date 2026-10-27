import * as React from "react";
import { useQueryClient, useServerFn, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { SiteChrome } from "@/components/site-chrome";
import { ProjectLogo } from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeRedirectPath } from "@/lib/auth-redirect";
import {
  createProject,
  ownedProjectQueryOptions,
  projectsQueryOptions,
  updateProject,
} from "@/lib/projects.functions";
import { projectInputSchema } from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/submit")({
  validateSearch: (search: Record<string, unknown>) => ({
    edit: typeof search.edit === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search.edit) ? search.edit : undefined,
  }),
  loader: ({ context, search }) => {
    if (!search.edit) return null;
    return context.queryClient.ensureQueryData(ownedProjectQueryOptions(search.edit));
  },
  head: () => ({
    meta: [
      { title: "List your project — Orbit" },
      {
        name: "description",
        content: "List your crypto project on Orbit before launch day.",
      },
      { property: "og:title", content: "List your project — Orbit" },
      { property: "og:description", content: "List your crypto project on Orbit." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SubmitPage,
});

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

type FormValues = {
  name: string;
  tagline: string;
  description: string;
  website_url: string;
  x_url: string;
  dev_x_url: string;
  launch_date: string;
};

function SubmitPage() {
  const { edit } = Route.useSearch();
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const existing = useSuspenseQuery({
    queryKey: ["owned-project", edit ?? "none"],
    queryFn: async () => null,
    enabled: false,
  });
  void existing;

  return <SubmitForm editId={edit ?? null} />;
}

function SubmitForm({ editId }: { editId: string | null }) {
  return null;
}
