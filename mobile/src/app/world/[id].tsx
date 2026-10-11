import { useLocalSearchParams } from 'expo-router';

import { WorldIntro } from '@/features/world-map';

export default function WorldScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorldIntro worldId={id} />;
}
