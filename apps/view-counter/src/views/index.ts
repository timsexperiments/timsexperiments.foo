import { badRequestResponse, responseJson, responseNoContent } from '@timsexperiments/http';
import { ViewsStorage, createDb, type View } from '@timsexperiments/view-storage';
import { RouteHandler, type Env } from '../index';

export class ViewsHandler implements RouteHandler {
	private readonly db: ViewsStorage;

	constructor(
		private readonly request: Request,
		private readonly env: Env,
	) {
		this.db = createDb({ host: env.DATABASE_HOST, username: env.DATABASE_USERNAME, password: env.DATABASE_PASSWORD });
	}

	async handle() {
		switch (this.request.method.toUpperCase()) {
			case 'GET':
				return this.GET();
			case 'POST':
				return this.POST();
		}
		return undefined;
	}

	private async GET(): Promise<Response> {
		const { page } = (await this.request.json()) as { page: string };
		if (!page) {
			return badRequestResponse({ message: 'Page is required.' });
		}
		this.db.pageViews(page);
		return responseJson({});
	}

	private async POST(): Promise<Response> {
		const view = (await this.request.json()) as View;
		this.db.add(view);
		return responseNoContent();
	}
}
