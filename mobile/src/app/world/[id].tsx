import { useLocalSearchParams } from 'expo-router';

import { WorldPathScreen } from '@/features/world-paths';

/** A world's path, opened by zooming into that world on the home map. */
export default function WorldScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorldPathScreen worldId={id} />;
}
