import { lazy } from "react";

/**
 * Wrapper peste React.lazy care previne erorile de "Failed to fetch dynamically imported module"
 * ce apar când Vercel publică o nouă versiune a aplicației în timp ce utilizatorul o are deschisă.
 */
export function lazyWithRetry(componentImport) {
  return lazy(async () => {
    const isAlreadyReloaded = sessionStorage.getItem("chunk_reload_retry");

    try {
      const component = await componentImport();
      sessionStorage.removeItem("chunk_reload_retry");
      return component;
    } catch (error) {
      const isChunkError =
        error?.name === "ChunkLoadError" ||
        error?.message?.includes("dynamically imported module") ||
        error?.message?.includes("Failed to fetch") ||
        error?.message?.includes("Importing a module script failed");

      if (isChunkError && !isAlreadyReloaded) {
        sessionStorage.setItem("chunk_reload_retry", "true");
        window.location.reload();
        return new Promise(() => {}); // Așteaptă reîncărcarea paginii
      }
      throw error;
    }
  });
}
