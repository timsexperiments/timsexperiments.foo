import { badRequestResponse, responseJson, responseNoContent } from '@timsexperiments/http';
import { ViewsStorage, createDb, type View } from '@timsexperiments/view-storage';
import { RouteHandler, type Env } from '../index';

export class ViewsHandler implements RouteHandler {
	private readonly db: ViewsStorage;
	private readonly url: URL;

	constructor(
		private readonly request: Request,
		private readonly env: Env,
	) {
		const db = createDb({ host: env.DATABASE_HOST, username: env.DATABASE_USERNAME, password: env.DATABASE_PASSWORD });
		this.db = new ViewsStorage(db);
		this.url = new URL(request.url);
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
		const page = this.url.searchParams.get('page');
		if (!page) {
			return badRequestResponse({ message: 'Page is required.' });
		}

		try {
			new URL(page);
		} catch {
			return badRequestResponse({ message: 'Page must be a valid fully qualified URL.' });
		}
		const views = await this.db.pageViews(page);
		return responseJson(views);
	}

	private async POST(): Promise<Response> {
		const view = (await this.request.json()) as View;
		this.db.add(view);
		return responseNoContent();
	}
}
