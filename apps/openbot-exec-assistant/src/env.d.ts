/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REPLAY?: string
  readonly VITE_LIVE?: string
  readonly VITE_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
