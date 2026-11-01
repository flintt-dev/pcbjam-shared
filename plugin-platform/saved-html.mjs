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

// Every <meta> tag goes except a plain charset or name/content pair: refresh
// is the one navigation no CSP directive covers, and matching its value
// literally can be evaded by entity encoding (ref&#114;esh decodes to refresh
// in the browser), so nothing about an http-equiv value is trusted. A tag
// runs to the first '>' outside a quoted value, or to the end of the input
// (an unterminated tag), so a '>' inside an earlier attribute cannot end the
// match early. Removal starts at '<meta', so stripping more than the browser
// would parse as the tag is always safe; only the plain forms, which every
// tokenizer reads the same way, are kept. Stripping repeats until nothing
// changes, so a removal cannot splice a new tag out of its neighbours.
// Comments win the alternation: a '<meta' inside <!-- --> is comment text in
// the browser, so stripping it must not eat the '-->' and comment out the
// rest of the page. An unterminated comment runs to EOF, as the browser
// treats it.
const COMMENT_OR_META = /<!--[\s\S]*?(?:-->|$)|<meta\b(?:[^>"']|"[^"]*(?:"|$)|'[^']*(?:'|$))*(?:>|$)/gi;
const PLAIN_META =
  /^<meta\s+(?:charset\s*=\s*"[^"<>&]*"|name\s*=\s*"[^"<>&]*"\s+content\s*=\s*"[^"<>&]*")\s*\/?>$/i;

function stripMeta(html) {
  return html.replace(COMMENT_OR_META, (m) => (m.startsWith("<!") ? m : PLAIN_META.test(m) ? m : ""));
}

// The bytes the host saves for files.saveHtml: policy prefix first, then the
// plugin's markup with its one unpoliceable redirect stripped.
export function savedHtmlPage(html) {
  if (typeof html !== "string") throw new Error("files.saveHtml html must be a string");
  let body = html;
  for (let next = stripMeta(body); next !== body; next = stripMeta(body)) body = next;
  return SAVED_HTML_PREFIX + body;
}
