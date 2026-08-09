import React from "react";

const VARIANT_CLASS = {
  primary: "app-btn app-btn-primary",
  secondary: "app-btn app-btn-secondary",
  danger: "app-btn app-btn-danger",
  ghost: "app-btn app-btn-ghost",
  icon: "app-btn app-btn-icon",
};

/**
 * Shared CTA — primary / secondary / danger / ghost / icon.
 * Keeps header, modals and lists on one button language.
 */
export default function AppButton({
  variant = "secondary",
  type = "button",
  className = "",
  children,
  ...rest
}) {
  const base = VARIANT_CLASS[variant] || VARIANT_CLASS.secondary;
  return (
    <button type={type} className={`${base} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
