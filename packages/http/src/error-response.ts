import { HttpStatuses } from "./status";

/** Options for creating an HTTP response representing an HTTP error. */
export interface ErrorResponseOptions {
  /** Message for the error response. */
  message?: string;
  /** The HTTP status code for the error. */
  status: number;
}

/** Options for creating a not found error response. */
export interface NotFoundResponseOptions {
  /** Message for the error response. */
  message?: string;
}

/**
 * Generates a response for a not found error.
 *
 * @param options - The options for the not found response.
 * @param options.message - The error message.
 * @returns The response object.
 */
export function notFoundResponse(options?: Partial<NotFoundResponseOptions>) {
  const { message } = options ?? {};
  return errorResponse({ message, status: HttpStatuses.STATUS_NOT_FOUND });
}

/**
 * Generates an error response with the given message and status.
 *
 * @param options - The options for the error response.
 * @param options.message - The error message.
 * @param options.status - The HTTP status code for the error response.
 * @returns The error response.
 */
export function errorResponse(options?: Partial<ErrorResponseOptions>) {
  const { message, status = HttpStatuses.STATUS_INTERNAL_ERROR } =
    options ?? {};
  return new Response(JSON.stringify({ message }), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}
