import React from "react";
import { glossaryForStatus, glossaryTitle } from "../../constants/glossary";

/**
 * Inline label with native tooltip (title) from glossary.
 * Use for AIR / Sosite / AP chips without heavy popovers.
 */
export default function GlossaryTip({
  term,
  children,
  className = "",
  as: Tag = "span",
}) {
  const g = glossaryForStatus(term);
  const title = glossaryTitle(term) || g?.hint;
  return (
    <Tag className={className} title={title} data-glossary={term || undefined}>
      {children}
    </Tag>
  );
}
