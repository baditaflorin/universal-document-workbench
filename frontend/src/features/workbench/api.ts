import {
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
): Promise<DocumentResult> {
  const body = new FormData();
  body.set("file", file);

  const response = await fetch(joinUrl(apiBaseUrl, "/api/v1/documents"), {
    method: "POST",
    body,
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : `Processing failed with ${response.status}`;
    throw new Error(message);
  }

  return documentResultSchema.parse(payload);
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}
