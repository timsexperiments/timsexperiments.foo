import { corsHeaders, notFoundResponse } from '@timsexperiments/http';
import { ViewsHandler } from './views';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `bun run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `bun run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

declare global {
	export interface Env {}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method.toUpperCase() === 'OPTIONS') {
			return new Response(null, {
				headers: { ...corsHeaders({ allowedOrigin: env.ALLOWED_ORIGIN }) },
			});
		}
		const requestUrl = new URL(request.url);
		let response: Response | undefined;
		switch (requestUrl.pathname) {
			case '/views':
			case '/views/':
				response = await new ViewsHandler(request, env).handle();
				break;
		}

		if (response) {
			return response;
		}

		return notFoundResponse({ message: `No matching request for ${request.method} ${requestUrl.pathname}` });
	},
};

export interface RouteHandler {
	handle(): Promise<Response | undefined>;
}
