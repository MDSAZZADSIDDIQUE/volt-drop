/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The API's public URL (.env.example). Defaults to http://localhost:4000. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
