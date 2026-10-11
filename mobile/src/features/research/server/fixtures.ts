import type { LaneSearchResult } from '../core/assemblePack';
import type { PlannedSearch } from '../core/queryPlan';
import type { Lane, ReadableDocument } from '../types';

/**
 * Mock data served when NIMBLE_API_KEY is not set, so anyone on the team can build UI without
 * a key or spending credits. URLs point at example.com on purpose: nothing here is real.
 */
const MOCK_RESULTS: Record<Lane, (topic: string) => LaneSearchResult> = {
  overview: (topic) => ({
    results: [
      {
        title: `A beginner's roadmap to ${topic}`,
        url: `https://example.com/${slug(topic)}/roadmap`,
        description: `What to learn first, what to skip, and how to build a daily ${topic} habit.`,
      },
      {
        title: `${capitalize(topic)} fundamentals in 10 minutes`,
        url: `https://www.youtube.com/watch?v=mock-${slug(topic)}`,
        description: `A quick visual walkthrough of the core ideas behind ${topic}.`,
      },
    ],
    answer: `Most people get into ${topic} by learning a few fundamentals [1], then practising a little every day [2]. Small, consistent sessions beat occasional long ones.`,
    answer_citations: [
      { marker: 1, result_index: 0 },
      { marker: 2, result_index: 1 },
    ],
  }),
  documents: (topic) => ({
    results: [
      {
        title: `${capitalize(topic)} study guide (PDF)`,
        url: `https://example.com/${slug(topic)}/study-guide.pdf`,
        description: `A printable guide covering the vocabulary and core concepts of ${topic}.`,
      },
    ],
  }),
  practice: (topic) => ({
    results: [
      {
        title: `5 daily ${topic} exercises`,
        url: `https://example.com/${slug(topic)}/exercises`,
        description: `Short exercises you can do in 20 minutes to build real ${topic} skills.`,
      },
    ],
  }),
  community: (topic) => ({
    results: [
      {
        title: `r/${slug(topic)}: beginners' questions`,
        url: `https://example.com/community/${slug(topic)}`,
        description: `A friendly forum where people share their first ${topic} projects.`,
      },
    ],
  }),
  events: (topic) => ({
    results: [
      {
        title: `Intro to ${topic}: weekend workshop`,
        url: `https://example.com/events/${slug(topic)}-workshop`,
        description: `A hands-on session for newcomers. No experience needed.`,
      },
    ],
  }),
};

export function buildMockLaneResult(planned: PlannedSearch, topic: string): LaneSearchResult {
  return MOCK_RESULTS[planned.lane](topic);
}

export function buildMockDocument(url: string): ReadableDocument {
  return {
    url,
    title: 'Mock document',
    markdown: [
      '# Mock document',
      '',
      'This is placeholder content because `NIMBLE_API_KEY` is not set on the server.',
      '',
      `With a key, this screen shows a clean, readable version of ${url} fetched through Nimble Extract.`,
    ].join('\n'),
    truncated: false,
    source: 'mock',
  };
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
