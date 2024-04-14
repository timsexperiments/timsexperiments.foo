import { SubscriptionValidator } from '@/db/validators';
import type { APIRoute } from 'astro';
import { db, eq, Subscription } from 'astro:db';

export const POST: APIRoute = async ({ params, request }) => {
  const searchParams = new URL(request.url).searchParams;
  const name = searchParams.get('name');
  const email = searchParams.get('email');

  const newSubscriptionResponse = SubscriptionValidator.safeParse({
    name,
    email,
    subscibed: true,
  });
  if (!newSubscriptionResponse.success) {
    return new Response(JSON.stringify({ message: 'Missing name or email.' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const newSubscription = newSubscriptionResponse.data;

  let subscription;
  try {
    const result = await db.insert(Subscription).values(newSubscription);
    const rowId = result.lastInsertRowid;
    subscription = db
      .select()
      .from(Subscription)
      .where(eq(Subscription.email, email ?? ''));
  } catch (e) {
    console.error(`Unable to create subscription: ${e}`);
    return new Response(
      JSON.stringify({ message: 'Unable to create subscription.' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return new Response(JSON.stringify(subscription), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
