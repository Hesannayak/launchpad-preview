import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SiteChrome } from "@/components/site-chrome";
import { ProjectCard } from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { projectsQueryOptions } from "@/lib/projects.functions";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(projectsQueryOptions),
  head: () => ({
    meta: [
      {
        title: "Devving — Discover crypto projects before they launch",
      },
      {
        name: "description",
        content:
          "A curated directory of crypto projects still in prelaunch. Browse upcoming launches, follow the builders, and list your own project before launch day.",
      },
      { property: "og:title", content: "Devving — Discover crypto projects before they launch" },
      {
        property: "og:description",
        content:
          "A curated directory of crypto projects still in prelaunch. Browse upcoming launches and list your own project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExplorerPage,
});

function ExplorerPage() {
  const { data } = useSuspenseQuery(projectsQueryOptions);
  const projects = data.projects;
  const upcoming = projects.filter(
    (project) => project.launch_date && new Date(`${project.launch_date}T23:59:59Z`) >= new Date(),
  );
  const list = projects;

  return (
    <SiteChrome>
      <div className="mx-auto max-w-3xl px-6">
        <section className="pb-4 pt-16 sm:pt-24">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Prelaunch directory
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
            Discover crypto projects before they launch.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Devving is a curated list of crypto projects still in the works. Browse what&rsquo;s
            coming, follow the builders, and list your own project before launch day.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild className="font-medium">
              <Link to="/auth" search={{ redirect: "/submit" }}>
                List your project
              </Link>
            </Button>
            <Button asChild variant="outline" className="font-medium">
              <a href="#launches">Browse launches</a>
            </Button>
          </div>
        </section>

        <section id="launches" className="mt-14 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Upcoming launches
            </h2>
            <span className="text-sm text-muted-foreground">
              {upcoming.length} of {list.length} upcoming
            </span>
          </div>

          {list.length === 0 ? (
            <div className="border-t border-border/70 py-20 text-center">
              <p className="text-muted-foreground">Nothing here yet.</p>
              <Button asChild variant="outline" className="mt-4 font-medium">
                <Link to="/auth" search={{ redirect: "/submit" }}>
                  List the first project
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4 border-b border-border/70">
              {list.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </div>
    </SiteChrome>
  );
}
