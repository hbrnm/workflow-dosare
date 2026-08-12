/**
 * Barrel re-export — importă din sub-module coezive.
 * Toți callers existenți pot continua să importe din acest fișier fără modificări.
 *
 * Pentru cod nou, preferă importul direct din sub-modulul corespunzător:
 *   import { emptyClaim, sanitizeClaim, parseNumber } from "./claimModel";
 *   import { uploadStorageItem, refreshStorageUrls } from "./claimMedia";
 *   import { toDb, fromDb, toDbPatch, writeDosarWithSchemaCompat } from "./claimDb";
 *   import { formatIstoricValoare, CAMP_LABELS } from "./claimFormat";
 */
export * from "./claimModel";
export * from "./claimMedia";
export * from "./claimDb";
export * from "./claimFormat";
