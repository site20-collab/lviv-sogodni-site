import assert from "node:assert/strict";
import test from "node:test";
import { isDue, resolveStatus } from "./domain.ts";
import { can } from "./permissions.ts";
import { escapeHtml, renderInline } from "./richtext.ts";
import { slugify } from "./slug.ts";

test("slugify transliterates Ukrainian", () => {
  assert.equal(slugify("У Львові сталася ДТП"), "u-lvovi-stalasia-dtp");
});

test("permissions separate authors from publishers", () => {
  assert.equal(can("AUTHOR", "publish"), false);
  assert.equal(can("EDITOR", "publish"), true);
  assert.equal(can("MODERATOR", "comments"), true);
  assert.equal(can("ANALYST", "articles"), false);
  assert.equal(can("SUPER_ADMIN", "users"), true);
});

test("author publish is forced to moderation", () => {
  const result = resolveStatus("publish", "AUTHOR", null, 1_000);
  assert.equal(result.status, "PENDING");
});

test("schedule requires a future time", () => {
  const past = resolveStatus("schedule", "EDITOR", new Date(500).toISOString(), 1_000);
  assert.ok(past.error);
  const future = resolveStatus("schedule", "EDITOR", new Date(5_000).toISOString(), 1_000);
  assert.equal(future.status, "SCHEDULED");
});

test("scheduled article is due only after its time", () => {
  assert.equal(isDue("SCHEDULED", new Date(500).toISOString(), 1_000), true);
  assert.equal(isDue("SCHEDULED", new Date(5_000).toISOString(), 1_000), false);
  assert.equal(isDue("DRAFT", new Date(500).toISOString(), 1_000), false);
});

test("inline text escapes html before marks", () => {
  const escaped = escapeHtml("<script>");
  assert.equal(escaped.includes("<"), false);
  assert.match(escaped, /lt;script/);
  assert.match(renderInline("**жирний**"), /<strong>жирний<\/strong>/);
  assert.equal(renderInline("**<b>").includes("<b>"), false);
});
