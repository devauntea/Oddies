/**
 * @jest-environment node
 */
import {
  DocumentUnavailableError,
  MAX_DOCUMENT_CHARS,
  readDocument,
} from '../server/documentService';

describe('readDocument', () => {
  it('returns a mock document without Nimble', async () => {
    const doc = await readDocument('https://example.com/a', { extract: null });
    expect(doc).toMatchObject({ source: 'mock', url: 'https://example.com/a' });
  });

  it('uses the first heading as the title and follows redirects', async () => {
    const extract = jest.fn(async () => ({
      ok: true,
      markdown: 'intro\n\n## Scales 101\n\nbody',
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

  it('truncates very long pages', async () => {
    const extract = async () => ({ ok: true, markdown: 'x'.repeat(MAX_DOCUMENT_CHARS + 10) });
    const doc = await readDocument('https://example.com/a', { extract });
    expect(doc.truncated).toBe(true);
    expect(doc.markdown).toHaveLength(MAX_DOCUMENT_CHARS);
  });

  it.each([{ ok: false, markdown: 'x' }, { ok: true, markdown: '   ' }, { ok: true }])(
    'fails cleanly on unusable extract result %j',
    async (result) => {
      await expect(
        readDocument('https://example.com/a', { extract: async () => result }),
      ).rejects.toBeInstanceOf(DocumentUnavailableError);
    },
  );
});
