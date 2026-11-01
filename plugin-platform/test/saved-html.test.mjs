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
  ];
  const page = savedHtmlPage('<p>ok</p>' + sneaky.join('') + '<p>done</p>');
  assert.equal(page, SAVED_HTML_PREFIX + '<p>ok</p><p>done</p>');
});

test('saved page: non-refresh meta tags and markup survive untouched', () => {
  const html = '<meta charset="utf-8"><meta name="viewport" content="w"><style>p{color:red}</style><p>body</p>';
  assert.equal(savedHtmlPage(html), SAVED_HTML_PREFIX + html);
});

test('saved page: html must be a string', () => {
  assert.throws(() => savedHtmlPage(undefined));
  assert.throws(() => savedHtmlPage(42));
});
