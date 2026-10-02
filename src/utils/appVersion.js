/** Commit-ul build-ului (setat de Vite din VERCEL_GIT_COMMIT_SHA); "dev" local. */
export const APP_VERSION = typeof __APP_COMMIT__ !== "undefined" ? __APP_COMMIT__ : "dev";
