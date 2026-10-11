import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import type { ResearchRequest, Resource } from './types';

/**
 * How other features (e.g. the timeline graph) open research for a branch:
 *
 *   router.push(researchHref({ topic: 'music', level: 'beginner', pathId: branch.id }));
 */
export function researchHref({ topic, level, goal, pathId }: ResearchRequest): Href {
  return {
    pathname: '/research/[topic]',
    params: {
      topic,
      ...(level && { level }),
      ...(goal && { goal }),
      ...(pathId && { pathId }),
    },
  };
}

/** Articles and study docs open in the in-app reader; everything else in the browser. */
export function openResource(resource: Resource): void {
  if (resource.kind === 'article' || resource.kind === 'document') {
    router.push({
      pathname: '/research/read',
      params: { url: resource.url, title: resource.title },
    });
    return;
  }
  void WebBrowser.openBrowserAsync(resource.url);
}
