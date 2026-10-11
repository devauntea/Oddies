/**
 * @jest-environment node
 */
import { checkLink, createDeadLinkFinder } from '../server/linkCheck';

const respond = (status: number) => async () => ({ status });

function networkError(code: string) {
  return async () => {
    throw Object.assign(new TypeError('fetch failed'), { cause: { code } });
  };
}

describe('checkLink', () => {
  it.each([
    [200, 'alive'],
    [301, 'alive'],
    [404, 'dead'],
    [410, 'dead'],
    // Bot protection and server errors are ambiguous: keep the link.
    [403, 'unknown'],
    [429, 'unknown'],
    [503, 'unknown'],
  ])('HTTP %i -> %s', async (status, expected) => {
    await expect(checkLink('https://example.com', respond(status))).resolves.toBe(expected);
  });

  it('treats a host that no longer exists as dead', async () => {
    await expect(checkLink('https://gone.example', networkError('ENOTFOUND'))).resolves.toBe(
      'dead',
    );
  });

  it('treats timeouts and other network errors as unknown', async () => {
    await expect(checkLink('https://slow.example', networkError('ETIMEDOUT'))).resolves.toBe(
      'unknown',
    );
  });

  it('only needs a HEAD request for a live page', async () => {
    const fetchFn = jest.fn(respond(200));
    await checkLink('https://example.com/a', fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://example.com/a',
      expect.objectContaining({ method: 'HEAD' }),
    );
  });

  it('confirms a HEAD 404 with GET, since some servers 404 every HEAD', async () => {
    const fetchFn = jest.fn(async (_url: string, init: RequestInit) => ({
      status: init.method === 'HEAD' ? 404 : 200,
    }));
    await expect(checkLink('https://www.92ny.org/classes', fetchFn)).resolves.toBe('alive');
    expect(fetchFn.mock.calls.map(([, init]) => init.method)).toEqual(['HEAD', 'GET']);
  });
});

describe('createDeadLinkFinder', () => {
  it('returns only the dead URLs', async () => {
    const find = createDeadLinkFinder(async (url) => ({
      status: url.endsWith('gone') ? 404 : 200,
    }));
    await expect(find(['https://a.example/ok', 'https://a.example/gone'])).resolves.toEqual(
      new Set(['https://a.example/gone']),
    );
  });
});
