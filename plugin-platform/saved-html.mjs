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
// in the browser), so nothing about an http-equiv value is trusted. Only the
// plain forms, which every tokenizer reads the same way, are kept.
const PLAIN_META =
  /^<meta\s+(?:charset\s*=\s*"[^"<>&]*"|name\s*=\s*"[^"<>&]*"\s+content\s*=\s*"[^"<>&]*")\s*\/?>$/i;
// Elements whose content the browser reads as text, never as markup: a '<meta'
// or '<!--' inside them is inert and must not be scanned as if it were real.
const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);

// Index just past the tag that opens at i: the first '>' outside a quoted
// attribute value (a '>' inside quotes is text), or the end of the input.
function tagEnd(html, i) {
  let quote = null;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (quote) { if (c === quote) quote = null; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === ">") return j + 1;
  }
  return html.length;
}

function tagName(html, i) {
  const m = /^<\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(html.slice(i));
  return m ? m[1].toLowerCase() : "";
}

// A tag-aware scan, not a regex over the whole string: it tracks where the
// browser would read markup, so '<meta' and '<!--' inside comments, quoted
// attributes or raw-text elements are passed through untouched instead of
// corrupting the page or hiding a live tag inside a fake comment.
function stripMeta(html) {
  let out = "", i = 0;
  while (i < html.length) {
    if (html.startsWith("<!--", i)) {
      const close = html.indexOf("-->", i + 4);
      const end = close === -1 ? html.length : close + 3;
      out += html.slice(i, end);
      i = end;
      continue;
    }
    if (/^<meta\b/i.test(html.slice(i, i + 6))) {
      const end = tagEnd(html, i);
      const tag = html.slice(i, end);
      out += PLAIN_META.test(tag) ? tag : "";
      i = end;
      continue;
    }
    if (html[i] === "<" && /[a-zA-Z!/]/.test(html[i + 1] ?? "")) {
      const end = tagEnd(html, i);
      out += html.slice(i, end);
      const name = tagName(html, i);
      i = end;
      if (RAW_TEXT.has(name)) {
        const closer = new RegExp(`</${name}\\b`, "gi");
        closer.lastIndex = i;
        const m = closer.exec(html);
        if (m) {
          const closeEnd = tagEnd(html, m.index);
          out += html.slice(i, closeEnd);
          i = closeEnd;
        } else {
          out += html.slice(i);
          i = html.length;
        }
      }
      continue;
    }
    out += html[i++];
  }
  return out;
}

// The bytes the host saves for files.saveHtml: policy prefix first, then the
// plugin's markup with its one unpoliceable redirect stripped.
export function savedHtmlPage(html) {
  if (typeof html !== "string") throw new Error("files.saveHtml html must be a string");
  let body = html;
  for (let next = stripMeta(body); next !== body; next = stripMeta(body)) body = next;
  return SAVED_HTML_PREFIX + body;
}
