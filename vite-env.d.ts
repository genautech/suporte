/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly GEMINI_API_KEY?: string;
  readonly VITE_POSTMARK_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}



