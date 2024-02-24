import { HttpStatuses } from "./status";

/** Options for creating an HTTP response representing an HTTP error. */
export interface ErrorResponseOptions {
  /** Message for the error response. */
  message: string;
  /** The HTTP status code for the error. */
  status: number;
}

/** Options for creating a not found error response. */
export interface NotFoundResponseOptions {
  /** Message for the error response. */
  message: string;
}

/**
 * Generates a response for a not found error.
 *
 * @param {NotFoundResponseOptions} options - The options for the not found response.
 * @param {string} options.message - The error message.
 * @returns {Response} The response object.
 */
export function notFoundResponse({ message }: NotFoundResponseOptions) {
  return errorResponse({ message, status: HttpStatuses.STATUS_NOT_FOUND });
}

/**
 * Generates an error response with the given message and status.
 *
 * @param {ErrorResponseOptions} options - The options for the error response.
 * @param {string} options.message - The error message.
 * @param {number} options.status - The HTTP status code for the error response.
 * @returns {Response} - The error response.
 */
export function errorResponse({ message, status }: ErrorResponseOptions) {
  return new Response(JSON.stringify({ message }), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}
