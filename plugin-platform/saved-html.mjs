// Shared, runtime-neutral rules for the standalone page files.saveHtml saves.
// A saved page is plugin markup carrying the user's design, opened outside
// PCBJam, so PCBJam — not the plugin — writes the first bytes: a policy that
// cannot be preceded or weakened by plugin content. A policy the page declares
// itself can only tighten it, because browsers enforce all policies at once.
//
// The page is static: script-src 'none' means its code never runs, so it cannot
// fetch, navigate itself, open a window or post a form, and everything remote
// (CDN scripts, web fonts, remote images, frames, objects) stays blocked by
// default-src 'none'. Inline styles and data:/blob: images, fonts and media
// still work, so a report keeps its formatting. No policy directive governs
// <meta http-equiv="refresh">, so the sanitizer removes the tag rather than
// trusting a rule. What remains is the user's own navigation — a link they
// click — which is their act on a file they chose to open, not the page
// sending anything.
export const SAVED_HTML_PREFIX =
  '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; media-src data: blob:; base-uri \'none\'; form-action \'none\'">\n';

// Any <meta> tag carrying http-equiv=refresh goes, whatever else it declares;
// attribute order and quoting do not matter.
const META_REFRESH = /<meta\b[^>]*?http-equiv\s*=\s*["']?\s*refresh\b[^>]*>/gi;

// The bytes the host saves for files.saveHtml: policy prefix first, then the
// plugin's markup with its one unpoliceable redirect stripped.
export function savedHtmlPage(html) {
  if (typeof html !== "string") throw new Error("files.saveHtml html must be a string");
  return SAVED_HTML_PREFIX + html.replace(META_REFRESH, "");
}
