import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import {
  openResource,
  ResearchPackView,
  type Level,
  type ResearchRequest,
} from '@/features/research';

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

  return (
    <>
      <Stack.Screen options={{ title: request.topic }} />
      <ResearchPackView request={request} onOpenResource={openResource} />
    </>
  );
}
