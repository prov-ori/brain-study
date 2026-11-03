import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import {
  filterNodes,
  regionOf,
  readProgress,
  advanceQuiz,
  nextQuestion,
} from "../src/atlas-data.js";
import { DATA, QUESTIONS } from "../src/content.js";
const nodes = JSON.parse(
  fs.readFileSync(new URL("../public/models/manifest.json", import.meta.url)),
).nodes;
test("bundled model is a valid GLB with a unique matching anatomical ID for every structure", () => {
  const b = fs.readFileSync(
    new URL("../public/models/brain.glb", import.meta.url),
  );
  assert.equal(b.readUInt32LE(0), 0x46546c67);
  assert.equal(b.readUInt32LE(4), 2);
  assert.equal(b.readUInt32LE(8), b.length);
  const gltf = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
  const ids = gltf.nodes.map((n) => n.extras?.bx_id);
  assert.equal(new Set(ids).size, nodes.length);
  assert.equal(nodes.length, 437);
  assert.deepEqual(
    [...ids].sort((a, b) => a - b),
    nodes.map((n) => n.id).sort((a, b) => a - b),
  );
  assert.equal(
    crypto.createHash("sha256").update(b).digest("hex"),
    "76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453",
  );
});
test("every learning region maps to actual anatomical nodes, not placeholder shapes", () => {
  for (const id of Object.keys(DATA))
    assert.ok(
      nodes.some((n) => regionOf(n) === id),
      id,
    );
  assert.equal(
    regionOf(nodes.find((n) => n.label === "Hippocampal commissure")),
    null,
  );
});
test("search filters hemisphere and category without dropping median structures", () => {
  assert.equal(
    filterNodes(nodes, { query: "Hippocampus" }).filter(
      (n) => n.label === "Hippocampus",
    ).length,
    2,
  );
  assert.ok(filterNodes(nodes, { query: "мозжечок" }).length > 0);
  assert.equal(filterNodes(nodes, { query: "no_such_structure" }).length, 0);
  assert.ok(
    filterNodes(nodes, { side: "left" }).every((n) => n.side !== "right"),
  );
  assert.ok(
    filterNodes(nodes, { category: "cortex" }).every(
      (n) => n.category === "cortex",
    ),
  );
});
test("damaged and maliciously shaped saved progress is bounded and deduplicated", () => {
  for (const text of ["null", "{", "42"])
    assert.deepEqual(readProgress({ getItem: () => text }), { lessons: [] });
  assert.deepEqual(
    readProgress({ getItem: () => '{"lessons":[0,0,1,9,-1,"2"]}' }),
    { lessons: [0, 1] },
  );
});
test("quiz completes and restarts repeatedly; each answer is scored only once", () => {
  for (let run = 0; run < 3; run++) {
    let s = { index: 0, score: 0, answered: false, finished: false };
    for (let i = 0; i < QUESTIONS.length; i++) {
      assert.equal(nextQuestion(s, QUESTIONS.length), s);
      s = advanceQuiz(s, QUESTIONS[i][2], QUESTIONS);
      assert.equal(advanceQuiz(s, 0, QUESTIONS), s);
      s = nextQuestion(s, QUESTIONS.length);
    }
    assert.equal(s.finished, true);
    assert.equal(s.score, 8);
  }
});
