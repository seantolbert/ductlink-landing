import { getOwnerShop, type Owner } from '@/lib/auth';
import { json, readBody, requireOwner, sameOrigin } from '@/lib/http';
import { siteOrigin } from '@/lib/server-env';
import { EMAIL_RE } from '@/lib/shop';
import { adminClient } from '@/lib/supabase/admin';

// The owner's team: who can sign in to the shop inbox.
//   GET    -> { members: [{ userId, email, role, invited }] }
//   POST   { email } invites a staff member
//   DELETE { userId } removes a staff member
// Memberships are only readable by each member themselves under RLS, so these
// run with the secret key, always scoped to the caller's own shop.

const MAX_TEAM = 25;

async function ownerShopId(owner: Owner): Promise<string | Response> {
  const shop = await getOwnerShop(owner);
  return shop ? shop.id : json(409, { error: 'Create your shop first.' });
}

export async function GET() {
  const owner = await requireOwner();
  if (owner instanceof Response) return owner;
  const shopId = await ownerShopId(owner);
  if (shopId instanceof Response) return shopId;

  const db = adminClient();
  const { data, error } = await db.from('shop_members').select('user_id, role, created_at').eq('shop_id', shopId).order('created_at');
  if (error) return json(503, { error: 'Couldn’t load your team.' });
  const members = await Promise.all(
    data.map(async (m) => {
      const { data: u } = await db.auth.admin.getUserById(m.user_id);
      return {
        userId: m.user_id as string,
        email: u.user?.email ?? '',
        role: m.role as 'owner' | 'staff',
        // Hasn't followed the invite link yet.
        invited: Boolean(u.user && !u.user.last_sign_in_at),
      };
    }),
  );
  return json(200, { members });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json(403, { error: 'Forbidden.' });
  const owner = await requireOwner();
  if (owner instanceof Response) return owner;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) return json(400, { error: 'Enter an email address.' });
  if (email === owner.email.toLowerCase()) return json(400, { error: 'That’s you. You’re already on the team.' });
  const shopId = await ownerShopId(owner);
  if (shopId instanceof Response) return shopId;

  const db = adminClient();
  const { count } = await db.from('shop_members').select('user_id', { count: 'exact', head: true }).eq('shop_id', shopId);
  if ((count ?? 0) >= MAX_TEAM) return json(409, { error: `Teams are limited to ${MAX_TEAM} people. Contact us for more.` });

  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    // The link lands on /auth/accept, which asks them to set a password and
    // then sends them to the shop inbox.
    redirectTo: `${siteOrigin(request)}/auth/accept?set=password&next=inbox`,
  });
  if (error || !data.user) {
    const taken = error?.message.toLowerCase().includes('already') ?? false;
    return json(taken ? 409 : 503, {
      error: taken
        ? 'That email already has a DuctLink login. Email support@ductlink.com and we’ll add them to your shop.'
        : 'Couldn’t send the invite right now. Try again.',
    });
  }
  const { error: memberError } = await db.from('shop_members').insert({ shop_id: shopId, user_id: data.user.id, role: 'staff' });
  if (memberError && memberError.code !== '23505') return json(503, { error: 'Invite sent, but couldn’t add them to your shop. Try again.' });
  return json(201, { userId: data.user.id, email });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json(403, { error: 'Forbidden.' });
  const owner = await requireOwner();
  if (owner instanceof Response) return owner;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!userId || userId === owner.userId) return json(400, { error: 'You can’t remove yourself.' });
  const shopId = await ownerShopId(owner);
  if (shopId instanceof Response) return shopId;

  const { error } = await adminClient().from('shop_members').delete().eq('shop_id', shopId).eq('user_id', userId).eq('role', 'staff');
  if (error) return json(503, { error: 'Couldn’t remove them right now.' });
  return json(200, { removed: userId });
}
