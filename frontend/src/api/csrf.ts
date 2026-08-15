/**
 * The CSRF cookie is deliberately not httpOnly (see PLAN.md CSRF decision) —
 * the frontend has to read it here and echo it back as a header so the
 * backend's double-submit check can tell a same-site request from a
 * cross-site one.
 */
const CSRF_COOKIE_NAME = "uw_csrf";
export const CSRF_HEADER_NAME = "X-CSRF-Token";

export function readCsrfToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
