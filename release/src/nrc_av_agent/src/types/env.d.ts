/* eslint-disable max-len */
/// <reference types="vite/client" />

/**
 * Describes all existing environment variables and their types.
 * Required for Code completion/intellisense and type checking.
 *
 * Note: To prevent accidentally leaking env variables to the client, only variables prefixed with `VITE_` are exposed to your Vite-processed code.
 *
 * @see https://github.com/vitejs/vite/blob/0a699856b248116632c1ac18515c0a5c7cf3d1db/packages/vite/types/importMeta.d.ts#L7-L14 Base Interface.
 * @see https://vitejs.dev/guide/env-and-mode.html#env-files Vite Env Variables Doc.
 */
interface ImportMetaEnv {
  readonly VITE_PORT: number;
  readonly VITE_AZURE_ACCOUNT_NAME: undefined | string;
  readonly VITE_AZURE_ACCOUNT_KEY: undefined | string;
  readonly VITE_AUTO_UPDATE_INTERVAL: undefined | string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
