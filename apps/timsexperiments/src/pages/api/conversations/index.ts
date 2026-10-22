import type { APIRoute } from 'astro';
import { conversationConfig } from '../../../lib/conversations/config';
import { handleConversations } from '../../../lib/conversations/handler';

export const prerender = false;

const route: APIRoute = ({ request, locals }) => handleConversations(request, conversationConfig(locals, {
  CONVERSATIONS_ENABLED: import.meta.env.CONVERSATIONS_ENABLED,
  DATABASE_URL: import.meta.env.DATABASE_URL,
  DATABASE_AUTH_TOKEN: import.meta.env.DATABASE_AUTH_TOKEN,
}));

export const PUT = route;
export const ALL = route;
