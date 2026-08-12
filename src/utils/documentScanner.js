/**
 * Barrel re-export — documentScanner.js
 * Păstrează compatibilitatea 100% cu toți importatorii existenți.
 *
 * Sub-module coezive:
 *   - documentDetect.js: detecție colțuri, geometrie quad, OpenCV / JS fallback
 *   - documentWarp.js: transformare de perspectivă, nivele scan, contrast, Pro mode
 *   - documentPdf.js: generare PDF A4, manipulare canvas & elemente imagine
 *   - documentPipeline.js: pipeline procesare automată (detect+warp+enhance)
 */

export * from "./documentDetect";
export * from "./documentWarp";
export * from "./documentPdf";
export * from "./documentPipeline";
