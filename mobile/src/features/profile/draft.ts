/** Holds onboarding input between the "share" and "review" screens. In memory only. */
let draft = { story: '', name: '' };

export const onboardingDraft = {
  get: () => draft,
  set: (next: Partial<typeof draft>) => {
    draft = { ...draft, ...next };
  },
  clear: () => {
    draft = { story: '', name: '' };
  },
};
