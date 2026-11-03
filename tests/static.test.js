import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
test("legacy Pages root serves compiled HTML and every referenced local asset exists", () => {
  const root = new URL("../", import.meta.url);
  const html = fs.readFileSync(new URL("index.html", root), "utf8");
  assert.ok(!html.includes("/src/main.js"));
  assert.ok(html.includes("/brain-study/assets/"));
  for (const match of html.matchAll(/(?:src|href)="(\/brain-study\/[^\"]+)"/g))
    assert.ok(
      fs.existsSync(new URL(match[1].replace("/brain-study/", ""), root)),
      match[1],
    );
  assert.ok(fs.existsSync(new URL(".nojekyll", root)));
  const bytes = fs.readFileSync(new URL("models/brain.glb", root));
  assert.equal(
    crypto.createHash("sha256").update(bytes).digest("hex"),
    "76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453",
  );
});
