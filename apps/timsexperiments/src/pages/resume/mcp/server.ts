import type { APIRoute } from 'astro';
import { handleResumeRequest } from '../../../lib/resume/server';

export const prerender = false;
export const ALL: APIRoute = ({ request }) => handleResumeRequest(request);
