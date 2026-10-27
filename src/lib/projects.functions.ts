import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { projectInputSchema, slugify, type ProjectSummary } from "./schemas";

// Logos live in a private bucket; listings receive short-lived signed URLs.
const LOGO_URL_TTL_SECONDS = 60 * 60 * 24 * 6;

function createPublicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }
  // Opaque sb_ keys aren't JWTs; send only apikey, not the default Authorization bearer.
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

async function attachLogoUrls(rows: ProjectRow[]): Promise<ProjectSummary[]> {
  const paths = Array.from(
    new Set(rows.map((row) => row.logo_url).filter((path): path is string => Boolean(path))),
  );

  const signedByUrl = new Map<string, string>();
  if (paths.length > 0) {
    const storageBase = `${process.env["SUPABASE_URL"]}/storage/v1`;
    const { data } = await createPublicClient()
      .storage.from("project-logos")
      .createSignedUrls(paths, LOGO_URL_TTL_SECONDS);
    for (const item of data ?? []) {
      if (item.path && item.signedURL) {
        // supabase-js can return a relative /object/sign path; resolve it against storage.
        const absolute = /^https?:\/\//i.test(item.signedURL)
          ? item.signedURL
          : `${storageBase}${item.signedURL}`;
        signedByUrl.set(item.path, absolute);
      }
    }
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline,
    description: row.description,
    website_url: row.website_url,
    x_url: row.x_url,
    dev_x_url: row.dev_x_url,
    launch_date: row.launch_date,
    logo_path: row.logo_url,
    logo_url: row.logo_url ? signedByUrl.get(row.logo_url) ?? null : null,
    owner_id: row.owner_id,
  }));
}

export const listProjects = createServerFn({ method: "GET" }).handler(async () => {
  const client = createPublicClient();
  const { data, error } = await client
    .from("projects")
    .select("*")
    .order("launch_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("listProjects failed:", error.message);
    return { projects: [] as ProjectSummary[], error: "Could not load projects" };
  }
  return { projects: await attachLogoUrls(data ?? []), error: null };
});

export const getProjectBySlug = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const client = createPublicClient();
    const { data, error } = await client
      .from("projects")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("getProjectBySlug failed:", error.message);
      throw new Error("Could not load this project");
    }
    if (!data) return { project: null };
    const [summary] = await attachLogoUrls([data]);
    return { project: summary ?? null };
  });

export const getOwnedProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (error) throw new Error("Could not load this listing");
    if (!row || row.owner_id !== context.userId) {
      throw new Error("You can only edit your own listings");
    }
    const [summary] = await attachLogoUrls([row]);
    return { project: summary ?? null };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => projectInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const values = {
      owner_id: context.userId,
      name: data.name,
      tagline: data.tagline,
      description: data.description,
      website_url: data.website_url ?? null,
      x_url: data.x_url ?? null,
      dev_x_url: data.dev_x_url ?? null,
      launch_date: data.launch_date ?? null,
      logo_url: data.logo_path ?? null,
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      const slug =
        attempt === 0
          ? slugify(data.name)
          : `${slugify(data.name)}-${Math.random().toString(36).slice(2, 7)}`;

      const { data: inserted, error } = await context.supabase
        .from("projects")
        .insert({ ...values, slug })
        .select("slug")
        .single();

      if (!error) return { slug: inserted.slug };
      if (error.code !== "23505") {
        console.error("createProject failed:", error.message);
        throw new Error("Could not publish your project. Please try again.");
      }
    }
    throw new Error("Could not publish your project. Please try again.");
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; patch: unknown }) => ({
    id: z.string().uuid().parse(input.id),
    patch: projectInputSchema.parse(input.patch),
  }))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("projects")
      .update({
        name: data.patch.name,
        tagline: data.patch.tagline,
        description: data.patch.description,
        website_url: data.patch.website_url ?? null,
        x_url: data.patch.x_url ?? null,
        dev_x_url: data.patch.dev_x_url ?? null,
        launch_date: data.patch.launch_date ?? null,
        logo_url: data.patch.logo_path ?? null,
      })
      .eq("id", data.id)
      .select("slug");

    if (error) {
      console.error("updateProject failed:", error.message);
      throw new Error("Could not save your changes. Please try again.");
    }
    const slug = updated?.[0]?.slug;
    if (!slug) {
      throw new Error("You can only edit your own listings");
    }
    return { slug };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: z.string().uuid().parse(input.id) }))
  .handler(async ({ data, context }) => {
    const { data: rows, error: selectError } = await context.supabase
      .from("projects")
      .select("id, owner_id, logo_url")
      .eq("id", data.id);

    if (selectError) throw new Error("Could not delete this listing");
    const row = rows?.[0];
    if (!row) return { ok: true };
    if (row.owner_id !== context.userId) {
      throw new Error("You can only delete your own listings");
    }

    if (row.logo_url) {
      const { error: storageError } = await context.supabase.storage
        .from("project-logos")
        .remove([row.logo_url]);
      if (storageError) {
        console.error("Logo cleanup failed:", storageError.message);
      }
    }

    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) {
      console.error("deleteProject failed:", error.message);
      throw new Error("Could not delete this listing");
    }
    return { ok: true };
  });

export const projectsQueryOptions = queryOptions({
  queryKey: ["projects"],
  queryFn: () => listProjects(),
  staleTime: 1000 * 60 * 5,
});

export const projectQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["project", slug],
    queryFn: () => getProjectBySlug({ data: slug }),
    staleTime: 1000 * 60 * 5,
  });

export const ownedProjectQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["owned-project", id],
    queryFn: () => getOwnedProject({ data: { id } }),
    staleTime: 0,
  });
