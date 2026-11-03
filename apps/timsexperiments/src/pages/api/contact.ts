import type { APIRoute } from 'astro';
import { z } from 'zod';
import { deliveryConfigSchema } from '@/lib/contact/delivery';
import { contactJson, handleContact } from '@/lib/contact/handler';
export const prerender = false;
const runtimeSchema = z.object({ runtime: z.object({ env: z.object({ RESEND_API_KEY: z.string().optional(), CONTACT_FROM_EMAIL: z.string().optional() }).passthrough() }).passthrough() }).passthrough();
function config(locals: unknown) {
  const runtime = runtimeSchema.safeParse(locals);
  const env = runtime.success ? runtime.data.runtime.env : undefined;
  return { apiKey: env?.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY, from: env?.CONTACT_FROM_EMAIL ?? import.meta.env.CONTACT_FROM_EMAIL };
}
export const GET: APIRoute = ({ locals }) => contactJson({ available: deliveryConfigSchema.safeParse(config(locals)).success });
export const POST: APIRoute = ({ request, locals }) => handleContact(request, config(locals));
