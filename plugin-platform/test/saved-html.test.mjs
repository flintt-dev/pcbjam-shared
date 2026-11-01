import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAVED_HTML_PREFIX, savedHtmlPage } from '../saved-html.mjs';

test('saved page: the policy bytes come before any plugin byte and forbid script', () => {
  const page = savedHtmlPage('<title>report</title><p>hello</p>');
  assert.ok(page.startsWith(SAVED_HTML_PREFIX));
  assert.match(page, /script-src 'none'/);
  assert.doesNotMatch(page, /script-src 'unsafe-inline'/);
});

test('saved page: meta refresh redirects are stripped', () => {
  const sneaky = [
    '<meta http-equiv="refresh" content="0;url=https://evil.example/?d=1">',
    '<META HTTP-EQUIV=Refresh CONTENT="0; URL=https://evil.example">',
    '<meta content="0;url=https://evil.example" http-equiv = "refresh">',
    "<meta http-equiv='refresh' content='5;url=https://evil.example'>",
    // Entity-encoded values decode to 'refresh' in the browser; the whole
    // http-equiv meta class goes, so encodings cannot evade.
    '<meta http-equiv="ref&#114;esh" content="0;url=https://evil.example">',
    '<meta http-equiv="default-style" content="x">',
  ];
  const page = savedHtmlPage('<p>ok</p>' + sneaky.join('') + '<p>done</p>');
  assert.equal(page, SAVED_HTML_PREFIX + '<p>ok</p><p>done</p>');
});

test('saved page: charset/name metas and markup survive untouched', () => {
  const html = '<meta charset="utf-8"><meta name="viewport" content="w"><style>p{color:red}</style><p>body</p>';
  assert.equal(savedHtmlPage(html), SAVED_HTML_PREFIX + html);
});

test('saved page: html must be a string', () => {
  assert.throws(() => savedHtmlPage(undefined));
  assert.throws(() => savedHtmlPage(42));
});

test('saved page: refresh metas that hide from a naive tag match are stripped', () => {
  const cases = [
    // '>' inside an earlier quoted value does not end the tag in the browser.
    '<meta content="a>b" http-equiv="refresh" content="0;url=https://evil.example">',
    "<meta name='x>y' http-equiv=refresh content='0;url=https://evil.example'>",
    // Removing one tag must not splice a new one together out of its neighbours.
    '<me<meta x>ta http-equiv="refresh" content="0;url=https://evil.example">',
    // A name/content pair only survives in its plain form.
    '<meta name="a" content="b" http-equiv="refresh">',
  ];
  for (const sneaky of cases) {
    const page = savedHtmlPage('<p>ok</p>' + sneaky + '<p>done</p>');
    const body = page.slice(SAVED_HTML_PREFIX.length);
    assert.doesNotMatch(body, /http-equiv[^<]*>/i, sneaky);
    assert.doesNotMatch(body, /<meta\b[^]*refresh/i, sneaky);
  }
});

test('saved page: a <meta inside an HTML comment stays inside it', () => {
  // Stripping the meta must not eat the comment's '-->' and comment out the
  // rest of the report.
  const page = savedHtmlPage('<!-- <meta http-equiv=refresh --> <p>report</p>');
  assert.equal(page, SAVED_HTML_PREFIX + '<!-- <meta http-equiv=refresh --> <p>report</p>');
});

test('saved page: a meta tag cut off by the end of the file is stripped', () => {
  for (const tail of ['<meta http-equiv="refresh" content="0;url=https://evil.example"', '<meta http-equiv=refresh content="0;url=https://evil.example', '<meta']) {
    assert.equal(savedHtmlPage('<p>ok</p>' + tail), SAVED_HTML_PREFIX + '<p>ok</p>', tail);
  }
});
