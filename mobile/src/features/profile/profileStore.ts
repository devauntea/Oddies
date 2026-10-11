import { createPersistedStore } from '@/lib/persistedStore';

/** What the user chose to share during onboarding. Stays on this device. */
export interface Profile {
  name?: string;
  /** Their own words. */
  story: string;
  /** Confirmed during review; drives world topics. */
  interests: string[];
  createdAt: string;
}

function isProfile(value: unknown): value is Profile | null {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const v = value as Partial<Profile>;
  return (
    typeof v.story === 'string' && Array.isArray(v.interests) && typeof v.createdAt === 'string'
  );
}

export const profileStore = createPersistedStore<Profile | null>(
  'oddies.profile.v1',
  null,
  isProfile,
);

export function useProfile() {
  const { value, hydrated } = profileStore.use();
  return { profile: value, hydrated };
}

export function saveProfile(profile: Profile): Promise<void> {
  return profileStore.update(() => profile);
}
