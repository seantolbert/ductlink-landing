import { json, readBody, requireOwner, sameOrigin } from '@/lib/http';
import { PREFIX_RE, slugProblem } from '@/lib/shop';
import { adminClient } from '@/lib/supabase/admin';

/**
 * POST /api/shops { name, slug, orderPrefix }
 * Creates the signed-in user's shop and makes them its owner. Shops can't be
 * inserted through RLS, so this runs with the secret key after its own checks.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json(403, { error: 'Forbidden.' });
  const owner = await requireOwner();
  if (owner instanceof Response) return owner;
  const body = await readBody(request);
  if (body instanceof Response) return body;

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  const orderPrefix = typeof body.orderPrefix === 'string' ? body.orderPrefix.trim().toUpperCase() : '';
  if (name.length < 1 || name.length > 120) return json(400, { error: 'Enter your shop’s name.', field: 'name' });
  const problem = slugProblem(slug);
  if (problem) return json(400, { error: problem === 'reserved' ? 'That link is reserved. Try another.' : 'Use lowercase letters, numbers, and dashes.', field: 'slug' });
  if (!PREFIX_RE.test(orderPrefix)) return json(400, { error: 'Use 2–8 capital letters or numbers.', field: 'orderPrefix' });

  const db = adminClient();
  const { data: existing, error: existingError } = await db.from('shop_members').select('shop_id').eq('user_id', owner.userId).eq('role', 'owner').limit(1);
  if (existingError) return json(503, { error: 'Couldn’t create your shop right now. Try again.' });
  if (existing.length > 0) return json(409, { error: 'You already have a shop.', shopId: existing[0].shop_id });

  const { data: shop, error } = await db.from('shops').insert({ name, slug, order_prefix: orderPrefix }).select('id').single();
  if (error) {
    if (error.code === '23505') return json(409, { error: 'Another shop has that link. Try another.', field: 'slug' });
    return json(503, { error: 'Couldn’t create your shop right now. Try again.' });
  }

  const rest = await Promise.all([
    db.from('shop_private').insert({ shop_id: shop.id, notify_emails: owner.email ? [owner.email] : [] }),
    db.from('shop_members').insert({ shop_id: shop.id, user_id: owner.userId, role: 'owner' }),
    db.from('shop_billing').insert({ shop_id: shop.id, status: 'none' }),
  ]);
  if (rest.some((r) => r.error)) {
    // Undo: the cascade removes whichever of the three rows did land.
    await db.from('shops').delete().eq('id', shop.id);
    return json(503, { error: 'Couldn’t create your shop right now. Try again.' });
  }
  return json(201, { shopId: shop.id, slug });
}
