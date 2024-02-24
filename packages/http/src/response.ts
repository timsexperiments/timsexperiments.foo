import { HttpStatuses } from "./status";

export function responseJson(data: any, options?: ResponseInit) {
  const {
    status = HttpStatuses.STATUS_OK,
    headers = {
      "Content-Type": "application/json",
    },
    ...rest
  } = options ?? {};
  return new Response(JSON.stringify(data), { status, headers, ...rest });
}

export function responseNoContent(options?: ResponseInit) {
  return new Response("", {
    status: HttpStatuses.STATUS_NO_CONTENT,
    ...options,
  });
}
