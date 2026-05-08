export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  version: import.meta.env.VITE_APP_VERSION ?? "0.1.0",
  commit: import.meta.env.VITE_GIT_COMMIT ?? "dev",
  repoUrl: "https://github.com/baditaflorin/universal-document-workbench",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
