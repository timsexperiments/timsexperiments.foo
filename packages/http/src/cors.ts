const ALLOW_ALL_ORIGINS = "*";
const DEFAULT_ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const DEFAULT_ALLOWED_HEADERS = ["*"];
const DEFAULT_MAX_AGE = 86400;

export type CorsHeadersOptions = (
  | {
      allowedOrigin: string;
      isPublic?: false;
    }
  | {
      isPublic: true;
    }
) & {
  allowedMethods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
  varyOrigin?: true;
};

export const corsHeaders = (
  options: CorsHeadersOptions = { isPublic: true }
) => {
  const {
    maxAge = DEFAULT_MAX_AGE,
    allowedMethods = DEFAULT_ALLOWED_METHODS,
    allowedHeaders = DEFAULT_ALLOWED_HEADERS,
    varyOrigin = true,
    isPublic,
  } = options;
  let headers: Record<string, string> = {
    "Access-Control-Allow-Origin": ALLOW_ALL_ORIGINS,
    "Access-Control-Allow-Headers": allowedHeaders.join(", "),
    "Access-Control-Allow-Methods": allowedMethods.join(", "),
    "Access-Control-Max-Age": `${maxAge}`,
  };

  if (!isPublic) {
    headers["Access-Control-Allow-Origin"] = options.allowedOrigin;
  }

  if (varyOrigin) {
    headers["Vary"] = "Origin";
  }

  return headers;
};
