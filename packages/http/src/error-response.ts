import { HttpStatuses } from "./status";

/** Options for creating a not found error response. */
export interface ErrorResponseOpitons extends ResponseInit {
  /** Message for the error response. */
  message: string;
}

/**
 * Generates a response for a not found error.
 *
 * @param options - The options for the not found response.
 * @returns The response object.
 */
export function notFoundResponse(options?: Partial<ErrorResponseOpitons>) {
  const { message } = options ?? {};
  return errorResponse({ message, status: HttpStatuses.STATUS_NOT_FOUND });
}

/**
 * Generates a response for a bad found error.
 *
 * @param options - The options for the not found response.
 * @returns The response object.
 */
export function badRequestResponse(options?: Partial<ErrorResponseOpitons>) {
  const { message } = options ?? {};
  return errorResponse({ message, status: HttpStatuses.STATUS_BAD_REQUEST });
}

/**
 * Generates an error response with the given message and status.
 *
 * @param options - The options for the error response.
 * @returns The error response.
 */
export function errorResponse(options?: Partial<ErrorResponseOpitons>) {
  const {
    message,
    headers,
    status = HttpStatuses.STATUS_INTERNAL_ERROR,
    ...rest
  } = options ?? {};
  return new Response(JSON.stringify({ message, status }), {
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    status,
    ...rest,
  });
}
