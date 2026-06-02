import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";
import { escapeRegex, eraToDecadePrefix, decadeBucketsFromText } from "../utils.js";

// ─── Unit tests: pure helpers (no DB, no network) ────────────────

test("escapeRegex escapes regex metacharacters", () => {
  assert.equal(escapeRegex("120 mm (MG253)"), "120 mm \\(MG253\\)");
  assert.equal(escapeRegex("a.b*c"), "a\\.b\\*c");
  assert.equal(escapeRegex("plain"), "plain");
});

test("eraToDecadePrefix turns an era label into a 3-char prefix", () => {
  assert.equal(eraToDecadePrefix("2000s"), "200");
  assert.equal(eraToDecadePrefix("1980s"), "198");
});

test("decadeBucketsFromText extracts decade buckets from serviceTime", () => {
  assert.deepEqual(decadeBucketsFromText("1979–1990s"), ["1970s", "1990s"]);
  assert.deepEqual(decadeBucketsFromText("2004–Present"), ["2000s"]);
  assert.deepEqual(decadeBucketsFromText("no years here"), []);
});

// ─── Integration test: /api/health via the real Express app ──────
// Starts the app on an ephemeral port; no MongoDB connection required.

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("GET /api/health returns 200 and status ok", async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.ok(body.time, "expected a timestamp");
});

test("unknown /api route returns 404 JSON", async () => {
  const res = await fetch(`${baseUrl}/api/does-not-exist`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.message, "Endpoint not found.");
});
