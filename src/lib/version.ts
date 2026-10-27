export const APP_CONFIG = {
  name: "SnippetVault",
  version: process.env.NEXT_PUBLIC_APP_VERSION || "0.8.0",
  env: (process.env.NEXT_PUBLIC_APP_ENV === "prod" ? "prod" : "dev") as "dev" | "prod",
  description: "Локальное хранилище сниппетов кода",
  author: "Kepler61b",
  githubUrl: "https://github.com/Kepler61b",
};
