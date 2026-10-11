import { ALL_LANES } from '../types';
import { parseDocumentRequest, parseResearchRequest } from '../core/validate';

describe('parseResearchRequest', () => {
  it('applies defaults and tidies whitespace', () => {
    const result = parseResearchRequest({ topic: '  learning   to DJ ' });
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        topic: 'learning to DJ',
        level: 'beginner',
        lanes: [...ALL_LANES],
      }),
    });
  });

  it('keeps requested lanes in canonical order', () => {
    const result = parseResearchRequest({
      topic: 'music',
      lanes: ['events', 'overview', 'events'],
    });
    expect(result.ok && result.value.lanes).toEqual(['overview', 'events']);
  });

  it.each([
    [null, 'Body must be a JSON object.'],
    [{ topic: 'a' }, '`topic` must be 2-80 characters.'],
    [
      { topic: 'music', level: 'expert' },
      '`level` must be one of: beginner, intermediate, advanced.',
    ],
    [{ topic: 'music', lanes: [] }, '`lanes` must be a non-empty array.'],
    [{ topic: 'music', lanes: ['overview', 'gossip'] }, 'Unknown lanes: gossip.'],
    [{ topic: 'music', country: 'USA' }, '`country` must be a 2-letter code.'],
    [{ topic: 'music', refresh: 'yes' }, '`refresh` must be a boolean.'],
    [{ topic: 'music', locale: 'english' }, '`locale` must look like "en" or "en-US".'],
  ])('rejects %j', (body, error) => {
    expect(parseResearchRequest(body)).toEqual({ ok: false, error });
  });

  it('upper-cases country codes', () => {
    const result = parseResearchRequest({ topic: 'music', country: 'us' });
    expect(result.ok && result.value.country).toBe('US');
  });
});

describe('parseDocumentRequest', () => {
  it('accepts http(s) URLs', () => {
    expect(parseDocumentRequest({ url: 'https://example.com/a' })).toEqual({
      ok: true,
      value: { url: 'https://example.com/a' },
    });
  });

  it.each([{}, { url: 'ftp://example.com' }, { url: 'not a url' }, { url: 42 }])(
    'rejects %j',
    (body) => {
      expect(parseDocumentRequest(body).ok).toBe(false);
    },
  );
});
