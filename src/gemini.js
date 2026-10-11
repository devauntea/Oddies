const Sentry = require('@sentry/node');
const { GoogleGenAI } = require('@google/genai');
const { HttpError } = require('./errors');

// Used when GEMINI_MODEL is not set. The current stable Flash model as of October 2026.
const DEFAULT_MODEL = 'gemini-3.8-flash';
const TIMEOUT_MS = 45_000;

// One place for every Gemini call. Each call runs inside a Sentry span that
// records the model and the token counts.
function createGemini({
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || DEFAULT_MODEL,
  // Optional. "low" makes gemini-3.8-flash answer faster. Leave unset for the
  // model's own default. Not every model accepts every level.
  thinkingLevel = process.env.GEMINI_THINKING_LEVEL || '',
} = {}) {
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // task: short name for the trace, e.g. "chat" or "today.queries"
  // system: the system prompt
  // contents: a string, or a list of { role: 'user' | 'model', parts: [{ text }] }
  // schema: optional JSON Schema. When set, the model must answer in that shape.
  async function generate({ task, system, contents, schema, attributes = {} }) {
    if (!ai) throw new HttpError(503, 'gemini_not_configured', 'GEMINI_API_KEY is not set on the server.');

    return Sentry.startSpan(
      {
        name: `generate_content ${model}`,
        op: 'gen_ai.generate_content',
        attributes: {
          'gen_ai.operation.name': 'generate_content',
          'gen_ai.provider.name': 'google_genai',
          'gen_ai.request.model': model,
          'oddies.task': task,
          ...attributes,
        },
      },
      async (span) => {
        let response;
        try {
          response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: system,
              abortSignal: AbortSignal.timeout(TIMEOUT_MS),
              ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
              ...(schema ? { responseMimeType: 'application/json', responseJsonSchema: schema } : {}),
            },
          });
        } catch (error) {
          span.setStatus({ code: 2, message: 'internal_error' });
          Sentry.captureException(error, { tags: { 'oddies.task': task } });
          console.error(`Gemini ${task} failed:`, error.message);
          throw new HttpError(502, 'gemini_failed', 'The model did not answer. Try again in a moment.');
        }

        const usage = response.usageMetadata || {};
        const tokens = {
          input: usage.promptTokenCount || 0,
          output: (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0),
          total: usage.totalTokenCount || 0,
        };
        span.setAttributes({
          'gen_ai.response.model': response.modelVersion || model,
          'gen_ai.usage.input_tokens': tokens.input,
          'gen_ai.usage.output_tokens': tokens.output,
          'gen_ai.usage.reasoning.output_tokens': usage.thoughtsTokenCount || 0,
          'gen_ai.usage.total_tokens': tokens.total,
        });
        return { text: response.text || '', tokens };
      }
    );
  }

  // Same as generate, but parses the JSON answer.
  async function generateJson(options) {
    const { text, tokens } = await generate(options);
    try {
      return { data: JSON.parse(text), tokens };
    } catch {
      throw new HttpError(502, 'gemini_bad_json', 'The model answered in a shape we could not read. Try again.');
    }
  }

  return { configured: Boolean(ai), model, generate, generateJson };
}

module.exports = { createGemini, DEFAULT_MODEL };
