/**
 * Barrel re-export — audatexParse.js
 * Păstrează compatibilitatea 100% cu toți importatorii existenți.
 *
 * Sub-module coezive:
 *   - audatexTypes.js: constante deviz Audatex, normalizare cifre/monedă RO și contorizare câmpuri
 *   - audatexExtract.js: parsare devize Audatex/DAT din text, XML și tabele Excel
 *   - audatexApply.js: aplicare valori deviz Audatex în modelul dosarului (claim)
 */

export * from "./audatexTypes";
export * from "./audatexExtract";
export * from "./audatexApply";
