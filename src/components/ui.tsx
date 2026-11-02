import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { Status } from "@/lib/domain";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 h-10 text-[0.9375rem] font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-action text-fern-ink hover:bg-action-hover",
  secondary: "border border-rule-strong bg-sheet-raised text-ink hover:border-ink-3 hover:bg-white",
  ghost: "text-ink-2 hover:bg-folder hover:text-ink",
  danger: "border border-danger/40 text-danger hover:bg-danger hover:text-white",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function StatusMark({ status, label }: { status: Status; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: `var(--st-${status})` }}
      />
      <span style={{ color: `color-mix(in oklab, var(--st-${status}) 70%, var(--ink))` }}>{label}</span>
    </span>
  );
}

export function PageHeader({
  title,
  lede,
  actions,
}: {
  title: string;
  lede?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-rule pb-5">
      <div className="min-w-0">
        <h1 className="font-serif text-[2rem] font-semibold leading-tight tracking-[-0.01em]">{title}</h1>
        {lede && <p className="mt-2 max-w-[60ch] text-ink-2">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Fields are ruled lines, like the blanks of a herbarium label. See .field-line in globals.css. */
export const fieldClass =
  "field-line block h-10 w-full rounded-none border-0 border-b border-rule-strong bg-transparent px-0.5 text-[0.9375rem] text-ink placeholder:text-ink-3/80 transition-[border-color,background-color,box-shadow] duration-150 hover:border-ink-3 focus-visible:border-tape focus-visible:bg-sheet-raised/70 focus-visible:shadow-[0_1px_0_0_var(--tape)] focus-visible:outline-none aria-invalid:border-danger";

/** Multi-line notes on ruled paper. */
export const ruledClass = `${fieldClass} ruled h-auto py-0`;

export function Field({
  label,
  hint,
  error,
  optional,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-2 text-sm font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-ink-3">{optional}</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
