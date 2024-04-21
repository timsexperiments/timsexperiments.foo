import { ViewsClient } from '@timsexperiments/views-client';

function countView() {
  const page = window.location.href;
  const viewsClient = new ViewsClient({
    host: import.meta.env.PUBLIC_VIEW_COUNTER_API,
  });
  viewsClient.addView({ page });
}

countView();
