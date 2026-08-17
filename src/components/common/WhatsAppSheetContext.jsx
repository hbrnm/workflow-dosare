import React, { createContext, useContext, useMemo } from "react";

const WhatsAppSheetContext = createContext(null);

export function WhatsAppSheetProvider({ children, payload, onOpen, onClose }) {
  const value = useMemo(
    () => ({
      payload,
      isOpen: Boolean(payload),
      open: onOpen,
      close: onClose,
    }),
    [payload, onOpen, onClose]
  );

  return (
    <WhatsAppSheetContext.Provider value={value}>
      {children}
    </WhatsAppSheetContext.Provider>
  );
}

export function useWhatsAppSheet() {
  return useContext(WhatsAppSheetContext);
}
