import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/generate/route.js";

const fields = { customer: "IKH", product: "Porakone", productInfo: "Kaksi akkua", audience: "Remontoijat", goal: "Tutustu tuotteeseen" };
const request = (body = fields, headers = {}) => new Request("http://localhost/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});
const success = (text = "Napakka markkinointiteksti.") => ({
  status: "completed",
  output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }],
});

test("Generate API", async (t) => {
  const originalKey = process.env.OPENAI_API_KEY;
  t.after(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });
  process.env.OPENAI_API_KEY = "test-secret-never-expose";

  await t.test("validates input without making OpenAI requests", async (t) => {
    const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected call"); });
    for (const body of [null, [], {}, { ...fields, customer: "Other" }, { ...fields, goal: "  " }, { ...fields, product: 5 }, { ...fields, productInfo: "a".repeat(4001) }]) {
      assert.equal((await POST(request(body))).status, 400);
    }
    assert.equal((await POST(request(fields, { origin: "https://other.example" }))).status, 403);
    assert.equal((await POST(request(fields, { "Content-Type": "text/plain" }))).status, 415);
    assert.equal((await POST(request({ ...fields, productInfo: "a".repeat(33000) }))).status, 413);
    assert.equal((await POST(new Request("http://localhost/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status, 400);
    assert.equal(fetch.mock.callCount(), 0);
  });

  await t.test("reports missing key safely", async () => {
    delete process.env.OPENAI_API_KEY;
    const response = await POST(request());
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /API-avain/);
    process.env.OPENAI_API_KEY = "test-secret-never-expose";
  });

  await t.test("sends all fields server-side and extracts output_text parts", async (t) => {
    t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(options.headers.Authorization, "Bearer test-secret-never-expose");
      const body = JSON.parse(options.body);
      assert.equal(body.model, "gpt-4.1-mini");
      assert.equal(body.store, false);
      assert.equal(body.max_output_tokens, 700);
      assert.ok(options.signal instanceof AbortSignal);
      assert.deepEqual(Object.values(JSON.parse(body.input)), Object.values(fields));
      assert.ok(!options.body.includes("test-secret"));
      const output = success();
      output.output.unshift({ type: "reasoning", summary: [] });
      output.output[1].content.push({ type: "output_text", text: "Tutustu tuotteeseen!" });
      return Response.json(output);
    });
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { text: "Napakka markkinointiteksti.\n\nTutustu tuotteeseen!" });
  });

  for (const [upstream, expected] of [[401, 503], [403, 503], [429, 429], [500, 502]]) {
    await t.test(`handles upstream ${upstream} without leaking error bodies`, async (t) => {
      t.mock.method(globalThis, "fetch", async () => Response.json({ error: "test-secret-never-expose" }, { status: upstream }));
      const response = await POST(request());
      assert.equal(response.status, expected);
      const body = await response.text();
      assert.ok(!body.includes("test-secret"));
      assert.ok(JSON.parse(body).error);
    });
  }

  for (const result of [{ ...success(), status: "incomplete" }, success(""), { status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "refusal", refusal: "No" }] }] }, { status: "completed" }]) {
    await t.test("rejects incomplete, empty, refused or malformed results", async (t) => {
      t.mock.method(globalThis, "fetch", async () => Response.json(result));
      assert.equal((await POST(request())).status, 502);
    });
  }

  for (const name of ["TimeoutError", "AbortError", "TypeError"]) {
    await t.test(`handles ${name} safely`, async (t) => {
      t.mock.method(globalThis, "fetch", async () => { const error = new Error("test-secret-never-expose"); error.name = name; throw error; });
      const response = await POST(request());
      assert.equal(response.status, name === "TypeError" ? 502 : 504);
      assert.ok(!(await response.text()).includes("test-secret"));
    });
  }
});
