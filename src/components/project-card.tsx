import { Link } from "@tanstack/react-router";
import { Code2, Globe, Twitter } from "lucide-react";

import type { ProjectSummary } from "@/lib/schemas";

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function utcMidnightToday(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export function launchLabel(iso: string): string {
  const target = new Date(`${iso}T00:00:00Z`).getTime();
  const days = Math.round((target - utcMidnightToday()) / 86_400_000);
  if (days === 0) return "launching today";
  if (days === 1) return "tomorrow";
  if (days > 1) return `in ${days} days`;
  if (days === -1) return "launched yesterday";
  return "launched";
}

export function ProjectLogo({
  name,
  url,
  className,
}: {
  name: string;
  url: string | null;
  className?: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={`${name} logo`}
        className={`shrink-0 rounded-lg border border-border/80 bg-card object-cover ${className ?? ""}`}
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg border border-border/80 bg-secondary font-display text-sm font-semibold text-secondary-foreground ${className ?? ""}`}
      aria-hidden="true"
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <div className="relative flex items-center gap-4 px-1 py-5">
      <ProjectLogo name={project.name} url={project.logo_url} className="size-10" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-medium text-foreground">{project.name}</h3>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{project.tagline}</p>
      </div>
      <div className="hidden items-center gap-3 sm:flex">
        {project.website_url ? (
          <a
            href={project.website_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            aria-label={`${project.name} website`}
            className="relative z-10 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Globe className="size-4" />
          </a>
        ) : null}
        {project.x_url ? (
          <a
            href={project.x_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            aria-label={`${project.name} on X`}
            className="relative z-10 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Twitter className="size-4" />
          </a>
        ) : null}
        {project.dev_x_url ? (
          <a
            href={project.dev_x_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            aria-label={`${project.name} developer on X`}
            className="relative z-10 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Code2 className="size-4" />
          </a>
        ) : null}
      </div>
      {project.launch_date ? (
        <div className="w-28 text-right">
          <div className="text-sm font-medium tabular-nums text-foreground">
            {formatDate(project.launch_date)}
          </div>
          <div className="mt-0.5 text-xs font-medium text-primary">
            {launchLabel(project.launch_date)}
          </div>
        </div>
      ) : null}
      <Link
        to="/project/$slug"
        params={{ slug: project.slug }}
        className="absolute inset-0 rounded-lg transition-colors hover:bg-accent/40"
        aria-label={`View ${project.name}`}
      />
    </div>
  );
}
