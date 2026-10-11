import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

type Settled<T> = Extract<AsyncState<T>, { status: 'success' | 'error' }>;

/**
 * Runs `run` whenever `key` changes, aborting the previous call. `key: null` means "don't run".
 * Small on purpose; if the app grows a shared data layer (e.g. TanStack Query), swap it in here.
 */
export function useAsync<T>(
  key: string | null,
  run: (signal: AbortSignal) => Promise<T>,
): AsyncState<T> & { reload: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ token: string; state: Settled<T> } | null>(null);
  const token = key === null ? null : `${attempt}:${key}`;

  useEffect(() => {
    if (token === null) return;
    const controller = new AbortController();
    run(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ token, state: { status: 'success', data } });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Something went wrong.';
        setSettled({ token, state: { status: 'error', error: message } });
      },
    );
    return () => controller.abort();
    // `run` is intentionally excluded: callers pass inline closures, and `key` (inside `token`)
    // captures everything that should trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  if (token === null) return { status: 'idle', reload };
  // A result for an older key/attempt is stale: we're loading the current one.
  if (settled?.token !== token) return { status: 'loading', reload };
  return { ...settled.state, reload };
}
