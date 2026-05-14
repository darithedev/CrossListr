/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FAKETSY_AUTH_ORIGIN?: string
  readonly VITE_FAKETSY_API_ORIGIN?: string
  readonly VITE_FAKETSY_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
