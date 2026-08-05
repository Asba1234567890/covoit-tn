// Shared class-string helpers rather than a wrapping component — every
// existing call site already uses native <button>/<Link> elements, so this
// keeps that (no new polymorphic component to route through) while still
// giving every button on the app the same four variants (design spec §3.4).
export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

const BASE =
  "inline-flex items-center justify-center rounded-control px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary/90",
  secondary: "border-[1.5px] border-primary bg-white text-primary hover:bg-primary/5",
  ghost: "px-2.5 py-2 text-primary hover:bg-primary/5",
  destructive: "bg-error text-white hover:bg-error/90",
};

export function buttonClasses(variant: ButtonVariant = "primary", extra = ""): string {
  return `${BASE} ${VARIANTS[variant]} ${extra}`.trim();
}
