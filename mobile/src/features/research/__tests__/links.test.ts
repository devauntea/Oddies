import { resolveLink } from '../core/links';

describe('resolveLink', () => {
  const page = 'https://www.musictheory.net/exercises/note';

  it('resolves relative links against the page', () => {
    expect(resolveLink('/products', page)).toBe('https://www.musictheory.net/products');
    expect(resolveLink('keysig', page)).toBe('https://www.musictheory.net/exercises/keysig');
  });

  it('keeps absolute http(s) links', () => {
    expect(resolveLink('https://youtu.be/abc', page)).toBe('https://youtu.be/abc');
  });

  it.each(['#top', '', 'javascript:alert(1)', 'mailto:hi@example.com'])(
    'returns null for %j, which only works on the original page',
    (href) => {
      expect(resolveLink(href, page)).toBeNull();
    },
  );
});
