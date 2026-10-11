import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import {
  openResource,
  ResearchPackView,
  type Level,
  type ResearchRequest,
  type ResearchTone,
} from '@/features/research';
import { findWorld } from '@/features/world-map';

const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

export default function ResearchScreen() {
  const params = useLocalSearchParams<{
    topic: string;
    level?: string;
    goal?: string;
    pathId?: string;
  }>();

  const request = useMemo<ResearchRequest>(
    () => ({
      topic: params.topic,
      level: LEVELS.includes(params.level as Level) ? (params.level as Level) : undefined,
      goal: params.goal,
      pathId: params.pathId,
    }),
    [params.topic, params.level, params.goal, params.pathId],
  );

  // Opened from a world on the map: wear that world's colors.
  const tone = useMemo<ResearchTone | undefined>(() => {
    const world = findWorld(params.pathId);
    return world
      ? { label: `${world.name} · ${world.personality}`, accent: world.accent, soft: world.patch }
      : undefined;
  }, [params.pathId]);

  return <ResearchPackView request={request} onOpenResource={openResource} tone={tone} />;
}
