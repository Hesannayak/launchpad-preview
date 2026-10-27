<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project: Devving

A prelaunch directory for crypto projects. Visitors browse upcoming launches;
signed-in users (Google / Lovable) can list, edit, and delete their own projects.
Listings publish instantly (no moderation queue).

## Architecture rules

- Project data lives in `public.projects`; logo files in the private Storage bucket
  `project-logos`, served to the app as short-lived signed URLs generated in
  `src/lib/projects.functions.ts` (the workspace blocks public buckets). Never switch
  to `getPublicUrl`.
- Server functions for projects are in `src/lib/projects.functions.ts`; shared zod
  validation and types in `src/lib/schemas.ts`. Route files must not query the
  database directly — always go through these server functions.
- Ownership: RLS scopes INSERT/UPDATE/DELETE to `owner_id = auth.uid()`; every
  mutating server function uses `requireSupabaseAuth` — the route guard alone is
  never the security boundary.
- Slugs are generated from the project name and made unique with a random suffix;
  slugs never change after creation (they are the public URL of a listing).
- Post-sign-in destination: sign-in stores the intended same-origin path under
  sessionStorage key `devving-post-auth-redirect` and the root route continues there
  once a session exists. OAuth `redirect_uri` stays `window.location.origin`.
- Explorer/home is `/` (public, SSR). `/submit` is public to view (the "List your
  project" form); publishing and edit mode (`?edit=<id>`) still require sign-in —
  edit redirects to `/auth`, and the server functions keep `requireSupabaseAuth`.
