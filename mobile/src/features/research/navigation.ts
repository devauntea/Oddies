import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { isFileUrl } from './core/normalize';
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

/**
 * - Videos open in the YouTube app when it's installed (Safari otherwise), so they play properly.
 * - Files (PDF, Word...) open in the in-app browser, whose built-in viewer renders them.
 * - Web articles and study pages open in the in-app reader, which falls back to the browser
 *   when a page has nothing readable (interactive tools, dead pages).
 * - Communities and events open in the browser: you act on them there.
 */
export function openResource(resource: Resource): void {
  if (resource.kind === 'video') {
    Linking.openURL(resource.url).catch(() => WebBrowser.openBrowserAsync(resource.url));
    return;
  }
  const readable = resource.kind === 'article' || resource.kind === 'document';
  if (readable && !isFileUrl(resource.url)) {
    router.push({
      pathname: '/research/read',
      params: { url: resource.url, title: resource.title },
    });
    return;
  }
  void WebBrowser.openBrowserAsync(resource.url);
}
