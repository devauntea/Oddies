/**
 * @jest-environment node
 */
import {
  DocumentUnavailableError,
  MAX_DOCUMENT_CHARS,
  MIN_READABLE_CHARS,
  readDocument,
} from '../server/documentService';

const article = 'A sentence about scales and chords. '.repeat(20);

describe('readDocument', () => {
  it('returns a mock document without Nimble', async () => {
    const doc = await readDocument('https://example.com/a', { extract: null });
    expect(doc).toMatchObject({ source: 'mock', url: 'https://example.com/a' });
  });

  it('uses the first heading as the title and follows redirects', async () => {
    const extract = jest.fn(async () => ({
      ok: true,
      markdown: `intro\n\n## Scales 101\n\n${article}`,
      url: 'https://example.com/final',
    }));
    const doc = await readDocument('https://example.com/a', { extract });
    expect(doc).toMatchObject({
      title: 'Scales 101',
      url: 'https://example.com/final',
      truncated: false,
      source: 'nimble',
    });
  });

  it('accepts a page right at the readable threshold', async () => {
    const extract = async () => ({
      ok: true,
      statusCode: 200,
      markdown: 'x'.repeat(MIN_READABLE_CHARS),
    });
    await expect(readDocument('https://example.com/a', { extract })).resolves.toMatchObject({
      source: 'nimble',
    });
  });

  it('truncates very long pages', async () => {
    const extract = async () => ({ ok: true, markdown: 'x'.repeat(MAX_DOCUMENT_CHARS + 10) });
    const doc = await readDocument('https://example.com/a', { extract });
    expect(doc.truncated).toBe(true);
    expect(doc.markdown).toHaveLength(MAX_DOCUMENT_CHARS);
  });

  it.each([
    { ok: false, markdown: article },
    { ok: true, markdown: '   ' },
    { ok: true },
    // A dead link: Nimble reports success but the page itself was a 404.
    { ok: true, statusCode: 404, markdown: `## 404\n\nError - Page Not Found ${article}` },
    // A PDF: extract returns the raw file bytes.
    { ok: true, statusCode: 200, markdown: `%PDF-1.5 ${article}` },
    // An interactive tool or index page: headings and links but no prose.
    {
      ok: true,
      markdown: '## STAFF IDENTIFICATION\n\n## EAR TRAINING\n\n[purchase our apps](/products)',
    },
  ])('fails cleanly on unusable extract result %j', async (result) => {
    await expect(
      readDocument('https://example.com/a', { extract: async () => result }),
    ).rejects.toBeInstanceOf(DocumentUnavailableError);
  });
});
