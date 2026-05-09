import {
  apiErrorSchema,
  documentResultSchema,
  healthSchema,
  type DocumentResult,
  type Health,
} from "./types";

export async function fetchHealth(apiBaseUrl: string): Promise<Health> {
  const response = await fetch(joinUrl(apiBaseUrl, "/healthz"));
  if (!response.ok) {
    throw new Error(`Health check failed with ${response.status}`);
  }

  return healthSchema.parse(await response.json());
}

export async function processDocument(
  apiBaseUrl: string,
  file: File,
  signal?: AbortSignal,
): Promise<DocumentResult> {
  const body = new FormData();
  body.set("file", file);

  const response = await fetch(joinUrl(apiBaseUrl, "/api/v1/documents"), {
    method: "POST",
    body,
    signal,
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(payload);
    if (parsed.success) {
      throw new DocumentApiError(parsed.data.error.message, parsed.data.error);
    }
    throw new Error(`Processing failed with ${response.status}`);
  }

  return documentResultSchema.parse(payload);
}

export class DocumentApiError extends Error {
  details: {
    code: string;
    message: string;
    what?: string;
    why?: string;
    now_what?: string;
    severity?: string;
    retryable?: boolean;
  };

  constructor(message: string, details: DocumentApiError["details"]) {
    super(message);
    this.name = "DocumentApiError";
    this.details = details;
  }
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}
