import { parseDocumentRequest } from '@/features/research/core/validate';
import { DocumentUnavailableError, readDocument } from '@/features/research/server/documentService';
import { nimbleExtract } from '@/features/research/server/nimble';

/**
 * POST /api/document
 * Body: { url }  ->  200 ReadableDocument | 400/502 { error }
 *
 * Fetches a page through Nimble Extract and returns it as markdown for the in-app reader.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body must be valid JSON.' }, { status: 400 });
  }

  const parsed = parseDocumentRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  try {
    const document = await readDocument(parsed.value.url, { extract: nimbleExtract() });
    return Response.json(document);
  } catch (error) {
    console.error('[api/document] failed', error);
    const message =
      error instanceof DocumentUnavailableError ? error.message : 'Something went wrong.';
    return Response.json({ error: message }, { status: 502 });
  }
}
