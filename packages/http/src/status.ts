/** Common status codes used in HTTP responses. */
export const HttpStatuses = {
  /** Ok status code. */
  STATUS_OK: 200,
  /** No content status code. */
  STATUS_NO_CONTENT: 201,
  /** Bad request error code. */
  STATUS_BAD_REQUEST: 400,
  /** Not found error code. */
  STATUS_NOT_FOUND: 404,
  /** Internal server error code. */
  STATUS_INTERNAL_ERROR: 500,
} as const;
