import { corsHeaders, notFoundResponse } from '@timsexperiments/http';
import { ViewsHandler } from './views';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `pnpm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `pnpm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

declare global {
	export interface Env {
		TURSO_AUTH_TOKEN: string;
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const baseHeaders = corsHeaders({
			allowedOrigin: env.ALLOWED_ORIGIN,
		});
		if (request.method.toUpperCase() === 'OPTIONS') {
			return new Response(null, {
				headers: { ...baseHeaders },
			});
		}
		const requestUrl = new URL(request.url);
		let response: Response | undefined;
		switch (requestUrl.pathname) {
			case '/views':
			case '/views/':
				response = await new ViewsHandler(request, env, baseHeaders).handle();
				break;
		}

		if (response) {
			return response;
		}

		return notFoundResponse({
			message: `No matching route for ${request.method} ${requestUrl.pathname}`,
			headers: baseHeaders,
		});
	},
};

export interface RouteHandler {
	handle(): Promise<Response | undefined>;
}
