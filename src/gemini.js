const Sentry = require('@sentry/node');
const { GoogleGenAI } = require('@google/genai');
const { HttpError } = require('./errors');

// Used when GEMINI_MODEL is not set. Measured on 2026-10-11 with the same chat
// request, three tries each: gemini-3.5-flash-lite about 1.2s with no failures,
// gemini-3.6-flash about 4.5s with no failures, gemini-3.8-flash 23 to 33s with
// one 503 in three. So the fast one leads and the others back it up.
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
// Tried in order when the main model is overloaded (503) or rate limited (429).
const DEFAULT_FALLBACK_MODELS = 'gemini-3.6-flash,gemini-3.8-flash';
const TIMEOUT_MS = 45_000;
// How long to wait before trying the main model a second time.
const RETRY_DELAY_MS = 700;

// True for errors worth another try: the model is busy, not the request being wrong.
function isBusy(error) {
  const text = String((error && error.message) || '');
  return (
    [429, 500, 503].includes(error && error.status) ||
    /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|INTERNAL/i.test(text)
  );
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One place for every Gemini call. Each call to the API runs inside its own
// Sentry span that records the model and the token counts.
function createGemini({
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || DEFAULT_MODEL,
  fallbackModels = (process.env.GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACK_MODELS).split(','),
  // Optional: how hard the main model thinks before answering ("low", "medium",
  // "high"). Unset means the model's own default, which is already the quickest
  // setting on gemini-3.5-flash-lite. Worth setting to "low" if you switch
  // GEMINI_MODEL to gemini-3.8-flash, whose default is slow.
  thinkingLevel = process.env.GEMINI_THINKING_LEVEL || '',
  // `client` lets tests pass a stand-in for the SDK.
  client,
  retryDelayMs = RETRY_DELAY_MS,
} = {}) {
  const ai = client || (apiKey ? new GoogleGenAI({ apiKey }) : null);
  const fallbacks = fallbackModels.map((name) => name.trim()).filter((name) => name && name !== model);
  // The main model gets two tries, then each fallback gets one.
  const attempts = [model, model, ...fallbacks];
  // Not every model accepts a thinking level. If one refuses it, stop sending it.
  let sendThinking = Boolean(thinkingLevel);

  // One request to one model, inside one span.
  function callModel(modelName, attempt, { task, system, contents, schema, attributes }) {
    return Sentry.startSpan(
      {
        name: `generate_content ${modelName}`,
        op: 'gen_ai.generate_content',
        attributes: {
          'gen_ai.operation.name': 'generate_content',
          'gen_ai.provider.name': 'google_genai',
          'gen_ai.request.model': modelName,
          'oddies.task': task,
          'oddies.attempt': attempt,
          ...attributes,
        },
      },
      async (span) => {
        let response;
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction: system,
              abortSignal: AbortSignal.timeout(TIMEOUT_MS),
              // The thinking setting is tuned for the main model only.
              ...(sendThinking && modelName === model ? { thinkingConfig: { thinkingLevel } } : {}),
              ...(schema ? { responseMimeType: 'application/json', responseJsonSchema: schema } : {}),
            },
          });
        } catch (error) {
          span.setStatus({ code: 2, message: isBusy(error) ? 'unavailable' : 'internal_error' });
          throw error;
        }

        const usage = response.usageMetadata || {};
        const tokens = {
          input: usage.promptTokenCount || 0,
          output: (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0),
          total: usage.totalTokenCount || 0,
        };
        span.setAttributes({
          'gen_ai.response.model': response.modelVersion || modelName,
          'gen_ai.usage.input_tokens': tokens.input,
          'gen_ai.usage.output_tokens': tokens.output,
          'gen_ai.usage.reasoning.output_tokens': usage.thoughtsTokenCount || 0,
          'gen_ai.usage.total_tokens': tokens.total,
        });
        return { text: response.text || '', tokens, model: modelName };
      }
    );
  }

  // task: short name for the trace, e.g. "chat" or "today.queries"
  // system: the system prompt
  // contents: a string, or a list of { role: 'user' | 'model', parts: [{ text }] }
  // schema: optional JSON Schema. When set, the model must answer in that shape.
  async function generate({ task, system, contents, schema, attributes = {} }) {
    if (!ai) throw new HttpError(503, 'gemini_not_configured', 'GEMINI_API_KEY is not set on the server.');

    let lastError;
    for (let i = 0; i < attempts.length; i += 1) {
      try {
        return await callModel(attempts[i], i + 1, { task, system, contents, schema, attributes });
      } catch (error) {
        lastError = error;
        console.error(`Gemini ${task} failed on ${attempts[i]} (try ${i + 1} of ${attempts.length}):`, error.message);
        if (!isBusy(error) && error.status === 400 && sendThinking && attempts[i] === model) {
          // Most likely the thinking level. Drop it and use the second try.
          sendThinking = false;
          if (i === 0) continue;
        }
        if (!isBusy(error)) break; // a bad request will not get better on another model
        if (i === 0) await wait(retryDelayMs);
      }
    }
    Sentry.captureException(lastError, { tags: { 'oddies.task': task } });
    const message = isBusy(lastError)
      ? 'The model is overloaded right now. Try again in a moment.'
      : 'The model did not answer. Try again in a moment.';
    throw new HttpError(502, 'gemini_failed', message);
  }

  // Same as generate, but parses the JSON answer.
  async function generateJson(options) {
    const { text, tokens, model: answeredBy } = await generate(options);
    try {
      return { data: JSON.parse(text), tokens, model: answeredBy };
    } catch {
      throw new HttpError(502, 'gemini_bad_json', 'The model answered in a shape we could not read. Try again.');
    }
  }

  return { configured: Boolean(ai), model, fallbackModels: fallbacks, generate, generateJson };
}

module.exports = { createGemini, DEFAULT_MODEL };
