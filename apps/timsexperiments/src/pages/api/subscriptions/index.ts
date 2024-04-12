import { SubscriptionValidator } from '@/db/validators';
import { LibsqlError } from '@libsql/core/api';
import type { APIRoute } from 'astro';
import { db, eq, Subscription } from 'astro:db';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  if (request.headers.get('Content-Type') === 'application/json') {
    const searchParams = new URL(request.url).searchParams;
    const { name, email, agree } = (await request.json()) as {
      name: string;
      email: string;
      agree: boolean;
    };

    const newSubscriptionResponse = SubscriptionValidator.safeParse({
      name,
      email,
      subscribed: true,
    });
    if (!newSubscriptionResponse.success) {
      console.log(newSubscriptionResponse.error);
      return new Response(
        JSON.stringify({ message: 'Missing name or email.' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!agree) {
      return new Response(
        JSON.stringify({ message: 'User did not agree to be emailed.' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const newSubscription = newSubscriptionResponse.data;

    let subscription;
    try {
      const result = await db.insert(Subscription).values(newSubscription);
      const rowId = result.lastInsertRowid;
      if (rowId) {
        subscription = await db
          .select()
          .from(Subscription)
          .where(eq(Subscription.id, new Number(rowId).valueOf()));
      }
    } catch (e: unknown) {
      console.error(`Unable to create subscription: ${e}`);

      if (e instanceof LibsqlError && e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return new Response(
          JSON.stringify({ message: 'User is already subscribed' }),
          {
            status: 409,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

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
  }

  return new Response(
    JSON.stringify({ message: 'Content type not supported.' }),
    {
      status: 415,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
