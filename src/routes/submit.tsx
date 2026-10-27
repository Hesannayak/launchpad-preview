import * as React from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { SiteChrome } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import {
  createProject,
  ownedProjectQueryOptions,
  projectQueryOptions,
  projectsQueryOptions,
  updateProject,
} from "@/lib/projects.functions";
import { projectInputSchema } from "@/lib/schemas";

export const Route = createFileRoute("/submit")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    edit:
      typeof search["edit"] === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search["edit"])
        ? search["edit"]
        : undefined,
  }),
  loader: async ({ context, location }) => {
    const edit = (location.search as { edit?: string }).edit;
    if (!edit) return null;
    // Editing an existing listing still needs a session; viewing the form is public.
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const target = location.pathname + (location.searchStr || "");
      throw redirect({ to: "/auth", search: { redirect: target } });
    }
    return context.queryClient.ensureQueryData(ownedProjectQueryOptions(edit));
  },
  head: () => ({
    meta: [
      { title: "List your project — Devving" },
      { name: "description", content: "List your crypto project on Devving before launch day." },
      { property: "og:title", content: "List your project — Devving" },
      { property: "og:description", content: "List your crypto project on Devving." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SubmitPage,
});

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

const blankValues = {
  name: "",
  tagline: "",
  description: "",
  website_url: "",
  x_url: "",
  dev_x_url: "",
  launch_date: "",
};

type FormValues = typeof blankValues;

function SubmitPage() {
  const { edit } = Route.useSearch();
  return edit ? <EditSubmitForm editId={edit} /> : <SubmitForm editId={null} defaults={blankValues} existingLogoPath={null} existingLogoUrl={null} />;
}

function EditSubmitForm({ editId }: { editId: string }) {
  const { data } = useSuspenseQuery(ownedProjectQueryOptions(editId));
  if (!data.project) throw new Error("Listing not found");
  const project = data.project;
  return (
    <SubmitForm
      editId={editId}
      defaults={{
        name: project.name,
        tagline: project.tagline,
        description: project.description,
        website_url: project.website_url ?? "",
        x_url: project.x_url ?? "",
        dev_x_url: project.dev_x_url ?? "",
        launch_date: project.launch_date ?? "",
      }}
      existingLogoPath={project.logo_path}
      existingLogoUrl={project.logo_url}
    />
  );
}

function SubmitForm({
  editId,
  defaults,
  existingLogoPath,
  existingLogoUrl,
}: {
  editId: string | null;
  defaults: FormValues;
  existingLogoPath: string | null;
  existingLogoUrl: string | null;
}) {
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createProjectFn = useServerFn(createProject);
  const updateProjectFn = useServerFn(updateProject);

  const [values, setValues] = React.useState<FormValues>(defaults);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(existingLogoUrl);
  const [currentLogoPath, setCurrentLogoPath] = React.useState<string | null>(existingLogoPath);

  const set = (key: keyof FormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((prev) => ({ ...prev, [key]: event.target.value }));

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  function clearLogo() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPreview(null);
    setCurrentLogoPath(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!session) {
      toast.error("Sign in to publish your listing.");
      navigate({ to: "/auth", search: { redirect: "/submit" } });
      return;
    }
    setSubmitting(true);
    setErrors({});

    try {
      let logoPath = currentLogoPath;

      const file = fileInputRef.current?.files?.[0];
      if (file) {
        if (!LOGO_TYPES.includes(file.type)) {
          toast.error("Logos must be PNG, JPG, WebP, or SVG.");
          setSubmitting(false);
          return;
        }
        if (file.size > LOGO_MAX_BYTES) {
          toast.error("Logos must be under 2 MB.");
          setSubmitting(false);
          return;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
        const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("project-logos")
          .upload(path, file, { contentType: file.type });
        if (uploadError) {
          console.error("Logo upload failed:", uploadError.message);
          toast.error("Logo upload failed. Please try again.");
          setSubmitting(false);
          return;
        }
        logoPath = path;
      }

      const payload = { ...values, logo_path: logoPath ?? "" };
      const parsed = projectInputSchema.safeParse(payload);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        setSubmitting(false);
        return;
      }

      const result = editId
        ? await updateProjectFn({ data: { id: editId, patch: payload } })
        : await createProjectFn({ data: payload });

      await queryClient.invalidateQueries({ queryKey: projectsQueryOptions.queryKey });
      await queryClient.invalidateQueries({ queryKey: projectQueryOptions(result.slug).queryKey });
      if (editId) {
        queryClient.invalidateQueries({ queryKey: ownedProjectQueryOptions(editId).queryKey });
      }

      toast.success(editId ? "Changes saved" : "Your project is live");
      navigate({ to: "/project/$slug", params: { slug: result.slug } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const fieldError = (key: keyof FormValues) => errors[key];

  return (
    <SiteChrome>
      <div className="mx-auto max-w-2xl px-6 pb-8 pt-12 sm:pt-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to launches
        </Link>

        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-foreground">
          {editId ? "Edit listing" : "List your project"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {editId
            ? "Update the details below. Changes appear on the explorer right away."
            : "Tell people what you're building and when you're launching. Your listing appears on the explorer immediately."}
        </p>

        <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" value={values.name} onChange={set("name")} placeholder="e.g. Nebula Protocol" maxLength={60} />
            {fieldError("name") ? <p className="text-xs text-destructive">{fieldError("name")}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" value={values.tagline} onChange={set("tagline")} placeholder="One line on what it does" maxLength={120} />
            {fieldError("tagline") ? <p className="text-xs text-destructive">{fieldError("tagline")}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={5} value={values.description} onChange={set("description")} placeholder="What you're building, who it's for, and why it matters." />
            {fieldError("description") ? <p className="text-xs text-destructive">{fieldError("description")}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              {preview ? (
                <img src={preview} alt="Logo preview" className="size-14 rounded-lg border border-border/80 object-cover" />
              ) : (
                <div className="grid size-14 place-items-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                  PNG / SVG
                </div>
              )}
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} id="logo" type="file" accept={LOGO_ACCEPT} className="hidden" onChange={onFileChange} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Choose file
                </Button>
                {currentLogoPath || fileInputRef.current?.files?.[0] ? (
                  <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={clearLogo}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, WebP, or SVG. Up to 2 MB.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="website_url">Website</Label>
              <Input id="website_url" type="url" value={values.website_url} onChange={set("website_url")} placeholder="https://yourproject.xyz" />
              {fieldError("website_url") ? <p className="text-xs text-destructive">{fieldError("website_url")}</p> : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="launch_date">Launch date</Label>
              <Input id="launch_date" type="date" value={values.launch_date} onChange={set("launch_date")} />
              {fieldError("launch_date") ? <p className="text-xs text-destructive">{fieldError("launch_date")}</p> : null}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="x_url">Project X</Label>
              <Input id="x_url" value={values.x_url} onChange={set("x_url")} placeholder="https://x.com/yourproject" />
              {fieldError("x_url") ? <p className="text-xs text-destructive">{fieldError("x_url")}</p> : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dev_x_url">Dev X</Label>
              <Input id="dev_x_url" value={values.dev_x_url} onChange={set("dev_x_url")} placeholder="https://x.com/yourdev" />
              {fieldError("dev_x_url") ? <p className="text-xs text-destructive">{fieldError("dev_x_url")}</p> : null}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <Button type="submit" disabled={submitting} className="font-medium">
              {submitting ? "Saving…" : editId ? "Save changes" : "Publish listing"}
            </Button>
            <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </SiteChrome>
  );
}
