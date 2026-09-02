import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/generate/route.js";

const fields = { customer: "IKH", product: "Porakone", productInfo: "Kaksi akkua", audience: "Remontoijat", goal: "Tutustu tuotteeseen" };
const request = (body = fields, headers = {}) => new Request("http://localhost/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});
const sections = {
  marketingAngle: "Tehoa vaativaan tekemiseen.",
  videoHook: "Mitä jos työkalusi pysyisi aina vauhdissasi?",
  socialPost: "Tee työsi tehokkaasti kahdella akulla. Tutustu tuotteeseen!",
};
const success = (content = sections) => ({
  status: "completed",
  output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify(content) }] }],
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

  await t.test("requests three structured sections and returns them separately", async (t) => {
    t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(options.headers.Authorization, "Bearer test-secret-never-expose");
      const body = JSON.parse(options.body);
      assert.equal(body.model, "gpt-4.1-mini");
      assert.equal(body.store, false);
      assert.equal(body.max_output_tokens, 700);
      assert.equal(body.text.format.type, "json_schema");
      assert.equal(body.text.format.strict, true);
      assert.deepEqual(body.text.format.schema.required, ["marketingAngle", "videoHook", "socialPost"]);
      assert.equal(body.text.format.schema.additionalProperties, false);
      assert.match(body.instructions, /Markkinointikulma/);
      assert.match(body.instructions, /Videokoukku/);
      assert.match(body.instructions, /Somejulkaisu/);
      assert.match(body.instructions, /älä keksi/i);
      assert.ok(options.signal instanceof AbortSignal);
      assert.deepEqual(Object.values(JSON.parse(body.input)), Object.values(fields));
      assert.ok(!options.body.includes("test-secret"));
      const output = success();
      output.output.unshift({ type: "reasoning", summary: [] });
      return Response.json(output);
    });
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { content: sections });
  });

  for (const [customer, instruction] of [
    ["IKH", "Kirjoita tekijähenkisesti, napakasti ja käytännönläheisesti. Vältä turhaa mainoskieltä."],
    ["Flextra", "Kirjoita asiantuntevasti B2B-kohderyhmälle. Tee teknisistä asioista ymmärrettäviä, mutta älä keksi teknisiä tietoja."],
    ["Jukolan Juusto", "Kirjoita helposti lähestyttävästi ja ruokahalua herättävästi. Korosta tuotteen makua ja käyttäjän antamia tuote-etuja, mutta älä keksi ominaisuuksia."],
  ]) {
    await t.test(`adds the ${customer} instruction to the prompt`, async (t) => {
      t.mock.method(globalThis, "fetch", async (_url, options) => {
        const body = JSON.parse(options.body);
        assert.match(body.instructions, new RegExp(`Asiakaskohtainen ohje asiakkaalle ${customer}:`));
        assert.ok(body.instructions.includes(instruction));
        return Response.json(success());
      });
      assert.equal((await POST(request({ ...fields, customer }))).status, 200);
    });
  }

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

  for (const result of [
    { ...success(), status: "incomplete" },
    success({ ...sections, videoHook: "" }),
    success({ marketingAngle: sections.marketingAngle, videoHook: sections.videoHook }),
    { status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "not json" }] }] },
    { status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "refusal", refusal: "No" }] }] },
    { status: "completed" },
  ]) {
    await t.test("rejects incomplete, empty, refused or malformed structured results", async (t) => {
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
