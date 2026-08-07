/** Tab/pill comun — Brief alerte, Flux filtre rapide, Pulsul etape. */
export function alertTabClass(tabKey, activeKey) {
  return `app-brief-tab app-brief-tab--${tabKey} px-2.5 py-1 rounded-full font-bold border transition-colors ${activeKey === tabKey ? "is-active" : ""}`;
}
