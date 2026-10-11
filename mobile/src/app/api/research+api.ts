import { parseResearchRequest } from '@/features/research/core/validate';
import { nimbleSearch } from '@/features/research/server/nimble';
import {
  defaultResearchCache,
  ResearchTimeoutError,
  ResearchUnavailableError,
  runResearch,
} from '@/features/research/server/researchService';

/**
 * POST /api/research
 * Body: ResearchRequest  ->  200 ResearchPack | 400/502 { error }
 *
 * Runs on the server (Metro in dev, EAS Hosting or any Expo server adapter in prod), so the
 * Nimble API key never ships inside the app.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body must be valid JSON.' }, { status: 400 });
  }

  const parsed = parseResearchRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  try {
    const pack = await runResearch(parsed.value, {
      search: nimbleSearch(),
      cache: defaultResearchCache,
      log: (message, error) => console.error(`[api/research] ${message}`, error),
    });
    return Response.json(pack);
  } catch (error) {
    console.error('[api/research] failed', error);
    if (error instanceof ResearchTimeoutError) {
      return Response.json({ error: error.message }, { status: 504 });
    }
    const message =
      error instanceof ResearchUnavailableError ? error.message : 'Something went wrong.';
    return Response.json({ error: message }, { status: 502 });
  }
}
