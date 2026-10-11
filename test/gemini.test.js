const test = require('node:test');
const assert = require('node:assert/strict');
const { createGemini } = require('../src/gemini');

const busy = () => Object.assign(new Error('{"error":{"code":503,"status":"UNAVAILABLE"}}'), { status: 503 });
const badRequest = () => Object.assign(new Error('{"error":{"code":400,"status":"INVALID_ARGUMENT"}}'), { status: 400 });

// A stand-in for the Gemini SDK. `outcomes` maps a model name to a list of
// results, used one per call: an Error to throw, or text to return.
function fakeSdk(outcomes) {
  const calls = [];
  return {
    calls,
    models: {
      async generateContent({ model, config }) {
        calls.push({ model, config });
        const next = (outcomes[model] || []).shift();
        if (next instanceof Error) throw next;
        return { text: next, usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4, thoughtsTokenCount: 2, totalTokenCount: 16 } };
      },
    },
  };
}

const make = (sdk, extra = {}) =>
  createGemini({ client: sdk, model: 'main', fallbackModels: ['second', 'third'], retryDelayMs: 0, ...extra });

test('a normal call returns text and token counts', async () => {
  const sdk = fakeSdk({ main: ['hello'] });
  const result = await make(sdk).generate({ task: 't', system: 's', contents: 'c' });
  assert.deepEqual(result, { text: 'hello', tokens: { input: 10, output: 6, total: 16 }, model: 'main' });
  assert.equal(sdk.calls[0].config.systemInstruction, 's');
});

test('a busy model is tried twice, then the fallbacks in order', async () => {
  const sdk = fakeSdk({ main: [busy(), busy()], second: [busy()], third: ['from third'] });
  const result = await make(sdk).generate({ task: 't', system: 's', contents: 'c' });
  assert.equal(result.text, 'from third');
  assert.equal(result.model, 'third');
  assert.deepEqual(sdk.calls.map((c) => c.model), ['main', 'main', 'second', 'third']);
});

test('one busy answer then success stays on the main model', async () => {
  const sdk = fakeSdk({ main: [busy(), 'second try'] });
  const result = await make(sdk).generate({ task: 't', system: 's', contents: 'c' });
  assert.equal(result.model, 'main');
  assert.equal(sdk.calls.length, 2);
});

test('if every model is busy the error says overloaded', async () => {
  const sdk = fakeSdk({ main: [busy(), busy()], second: [busy()], third: [busy()] });
  await assert.rejects(
    () => make(sdk).generate({ task: 't', system: 's', contents: 'c' }),
    (error) => error.code === 'gemini_failed' && /overloaded/.test(error.message) && error.status === 502
  );
});

test('a bad request is not retried', async () => {
  const sdk = fakeSdk({ main: [badRequest()] });
  await assert.rejects(() => make(sdk, { thinkingLevel: '' }).generate({ task: 't', system: 's', contents: 'c' }), /did not answer/);
  assert.equal(sdk.calls.length, 1);
});

test('if a model refuses the thinking level, it is dropped and the call is tried once more', async () => {
  const sdk = fakeSdk({ main: [badRequest(), 'fine without it', 'still fine'] });
  const gemini = make(sdk, { thinkingLevel: 'low' });
  const result = await gemini.generate({ task: 't', system: 's', contents: 'c' });
  assert.equal(result.text, 'fine without it');
  assert.deepEqual(sdk.calls[0].config.thinkingConfig, { thinkingLevel: 'low' });
  assert.equal(sdk.calls[1].config.thinkingConfig, undefined);
  await gemini.generate({ task: 't', system: 's', contents: 'c' });
  assert.equal(sdk.calls[2].config.thinkingConfig, undefined, 'and it stays off for later calls');
});

test('a schema asks for JSON, and the thinking level only goes to the main model', async () => {
  const sdk = fakeSdk({ main: [busy(), busy()], second: ['{"ok":true}'] });
  const gemini = make(sdk, { thinkingLevel: 'low' });
  const { data, model } = await gemini.generateJson({ task: 't', system: 's', contents: 'c', schema: { type: 'object' } });
  assert.deepEqual(data, { ok: true });
  assert.equal(model, 'second');
  assert.equal(sdk.calls[0].config.responseMimeType, 'application/json');
  assert.deepEqual(sdk.calls[0].config.responseJsonSchema, { type: 'object' });
  assert.deepEqual(sdk.calls[0].config.thinkingConfig, { thinkingLevel: 'low' });
  assert.equal(sdk.calls[2].config.thinkingConfig, undefined);
});

test('unreadable JSON is reported, and no key means not configured', async () => {
  const sdk = fakeSdk({ main: ['not json'] });
  await assert.rejects(() => make(sdk).generateJson({ task: 't', system: 's', contents: 'c', schema: {} }), /could not read/);

  const off = createGemini({ apiKey: '' });
  assert.equal(off.configured, false);
  await assert.rejects(() => off.generate({ task: 't', system: 's', contents: 'c' }), /GEMINI_API_KEY is not set/);
});
