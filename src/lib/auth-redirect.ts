export const POST_AUTH_REDIRECT_KEY = "orbit-post-auth-redirect";

/** Keep only same-origin relative paths as post-sign-in destinations. */
export function sanitizeRedirectPath(value: string | undefined | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}
