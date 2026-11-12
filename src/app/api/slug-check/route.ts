import { json } from '@/lib/http';
import { slugProblem } from '@/lib/shop';
import { adminClient } from '@/lib/supabase/admin';

/** GET /api/slug-check?slug=acme -> { available, reason? } */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug')?.trim().toLowerCase() ?? '';
  const problem = slugProblem(slug);
  if (problem) return json(200, { available: false, reason: problem });
  const { data, error } = await adminClient().from('shops').select('id').eq('slug', slug).maybeSingle();
  if (error) return json(503, { error: 'Couldn’t check that link right now.' });
  return json(200, data ? { available: false, reason: 'taken' } : { available: true });
}
