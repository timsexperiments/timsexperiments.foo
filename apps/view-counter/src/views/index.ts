import { badRequestResponse, errorResponse, responseJson, responseNoContent } from '@timsexperiments/http';
import { ViewsStorage, createDb, type View } from '@timsexperiments/view-storage';
import { RouteHandler } from '../index';

export class ViewsHandler implements RouteHandler {
	private readonly db: ViewsStorage;
	private readonly url: URL;
	private readonly baseHeaders: Record<string, string>;

	constructor(
		private readonly request: Request,
		env: Env,
		baseHeaders: Record<string, string>,
	) {
		console.log(env.TURSO_AUTH_TOKEN);
		const db = createDb({
			url: env.TURSO_URL,
			authToken: env.TURSO_AUTH_TOKEN,
		});
		this.db = new ViewsStorage(db);
		this.url = new URL(request.url);
		this.baseHeaders = {
			...baseHeaders,
		};
	}

	async handle() {
		try {
			switch (this.request.method.toUpperCase()) {
				case 'GET':
					return await this.GET();
				case 'POST':
					return await this.POST();
			}
			return undefined;
		} catch (e) {
			console.error(`An error occurred: ${e}`);
			return errorResponse({
				message: 'An unexpected error occurred.',
				headers: this.baseHeaders,
			});
		}
	}

	private async GET(): Promise<Response> {
		const page = this.url.searchParams.get('page');
		if (!page) {
			return badRequestResponse({
				message: 'Page is required.',
				headers: this.baseHeaders,
			});
		}

		try {
			new URL(page);
		} catch {
			return badRequestResponse({
				message: 'Page must be a valid fully qualified URL.',
				headers: this.baseHeaders,
			});
		}
		const views = await this.db.pageViews(page);
		console.log(views);
		return responseJson({ views }, { headers: this.baseHeaders });
	}

	private async POST(): Promise<Response> {
		const clientIP = this.request.headers.get('CF-Connecting-IP')!;
		const view = (await this.request.json()) as Omit<View, 'ipAddress'>;
		await this.db.add({ ipAddress: clientIP, ...view });
		return responseNoContent({ headers: this.baseHeaders });
	}
}
