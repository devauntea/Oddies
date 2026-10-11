import { normalizeUrl } from '../core/ids';
import { dedupeResources, toResource } from '../core/normalize';

describe('normalizeUrl', () => {
  it('strips tracking params, hash and trailing slash, and lower-cases the host', () => {
    expect(normalizeUrl('https://WWW.Example.com/guide/?utm_source=x&page=2#top')).toBe(
      'https://www.example.com/guide?page=2',
    );
  });

  it('rejects non-http URLs', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('nope')).toBeNull();
  });
});

describe('toResource', () => {
  it('detects videos and documents from the URL', () => {
    const video = toResource(
      { title: 'v', url: 'https://www.youtube.com/watch?v=1' },
      'overview',
      'article',
    );
    const pdf = toResource(
      { title: 'p', url: 'https://example.com/guide.PDF' },
      'practice',
      'article',
    );
    expect(video?.kind).toBe('video');
    expect(pdf?.kind).toBe('document');
  });

  it('keeps community and event kinds even on video hosts', () => {
    const resource = toResource(
      { title: 'c', url: 'https://youtube.com/@club' },
      'community',
      'community',
    );
    expect(resource?.kind).toBe('community');
  });

  it('falls back to the hostname for a missing title and shortens long descriptions', () => {
    const resource = toResource(
      { title: ' ', url: 'https://www.example.com/a', description: 'x'.repeat(400) },
      'overview',
      'article',
    );
    expect(resource?.title).toBe('example.com');
    expect(resource?.description).toHaveLength(280);
  });

  it('gives the same URL the same id regardless of tracking params', () => {
    const a = toResource(
      { title: 'a', url: 'https://example.com/a?utm_medium=x' },
      'overview',
      'article',
    );
    const b = toResource({ title: 'b', url: 'https://example.com/a/' }, 'practice', 'article');
    expect(a?.id).toBe(b?.id);
    expect(dedupeResources([a!, b!])).toEqual([a]);
  });
});
