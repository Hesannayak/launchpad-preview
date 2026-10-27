import * as React from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Code2, Globe, Twitter } from "lucide-react";
import { toast } from "sonner";

import { SiteChrome } from "@/components/site-chrome";
import { formatDate, launchLabel, ProjectLogo } from "@/components/project-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { deleteProject, projectQueryOptions, projectsQueryOptions } from "@/lib/projects.functions";

export const Route = createFileRoute("/project/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(projectQueryOptions(params.slug));
    if (!data.project) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const project = loaderData?.project;
    return {
      meta: [
        {
          title: project ? `${project.name} — Orbit` : "Orbit",
        },
        {
          name: "description",
          content: project?.tagline ?? "Discover crypto projects before they launch on Orbit.",
        },
        { property: "og:title", content: project ? `${project.name} — Orbit` : "Orbit" },
        {
          property: "og:description",
          content: project?.tagline ?? "Discover crypto projects before they launch.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(projectQueryOptions(slug));
  const project = data.project;
  if (!project) throw notFound();

  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteProjectFn = useServerFn(deleteProject);
  const [deleting, setDeleting] = React.useState(false);
  const isOwner = Boolean(session && session.user.id === project.owner_id);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProjectFn({ data: { id: project.id } });
      await queryClient.invalidateQueries({ queryKey: projectsQueryOptions.queryKey });
      toast.success("Listing deleted");
      navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this listing");
      setDeleting(false);
    }
  }

  const meta = [
    { label: "Website", value: project.website_url },
    { label: "Project X", value: project.x_url },
    { label: "Dev X", value: project.dev_x_url },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

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

        <div className="mt-8 flex items-start gap-5">
          <ProjectLogo name={project.name} url={project.logo_url} className="size-16" />
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              {project.name}
            </h1>
            <p className="mt-1.5 text-base text-muted-foreground">{project.tagline}</p>
            {project.launch_date ? (
              <p className="mt-3 text-sm">
                <span className="font-medium text-foreground">{formatDate(project.launch_date)}</span>
                <span className="text-muted-foreground"> · {launchLabel(project.launch_date)}</span>
              </p>
            ) : null}
          </div>
        </div>

        {isOwner ? (
          <div className="mt-6 flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="font-medium">
              <Link to="/submit" search={{ edit: project.id }}>
                Edit listing
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="font-medium text-destructive hover:text-destructive" disabled={deleting}>
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {project.name} will be removed from the explorer. This can&rsquo;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep listing</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}

        <div className="mt-10 whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">
          {project.description}
        </div>

        {meta.length > 0 ? (
          <dl className="mt-10 border-t border-border/70">
            {meta.map((item) => (
              <div key={item.label} className="flex items-center gap-4 border-b border-border/70 py-3.5">
                <dt className="w-28 shrink-0 text-sm text-muted-foreground">{item.label}</dt>
                <dd className="flex min-w-0 items-center gap-2 text-sm">
                  <a
                    href={item.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {item.value.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                  {item.label === "Website" ? (
                    <Globe className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : item.label === "Dev X" ? (
                    <Code2 className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <Twitter className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </SiteChrome>
  );
}
