import Link from "next/link";
import { cn } from "@/lib/cn";

export const inputClass =
  "w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-base text-fg sm:text-sm placeholder:text-fg-muted/60 transition-colors focus:border-brand-bright focus:outline-none disabled:opacity-50";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cn(inputClass, "resize-y", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClass, "appearance-none pr-8", props.className)} />;
}

export function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-fg">
        {label}
        {required && <span className="ml-0.5 text-brand-bright">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-fg-muted">{hint}</span>}
    </label>
  );
}

type ButtonProps = {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const variants = {
  primary: "bg-brand-bright text-black hover:bg-brand-glow font-semibold",
  secondary: "border border-border bg-surface-2 text-fg hover:border-brand-bright/50",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
  ghost: "text-fg-muted hover:text-fg hover:bg-surface-2",
};

export function buttonClass(variant: ButtonProps["variant"] = "secondary", size: ButtonProps["size"] = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "px-3 py-2 text-xs sm:py-1.5" : "px-4 py-3 text-sm sm:py-2.5",
    variants[variant],
  );
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} {...props} className={cn(buttonClass(variant, size), className)} />;
}

export function LinkButton({
  href,
  variant,
  size,
  children,
  className,
}: {
  href: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(buttonClass(variant, size), className)}>
      {children}
    </Link>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("rounded-xl border border-border bg-surface p-5", className)} />;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-sm text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ tone = "muted", children }: { tone?: "muted" | "green" | "warn" | "danger"; children: React.ReactNode }) {
  const tones = {
    muted: "border-border text-fg-muted",
    green: "border-brand-bright/40 bg-brand/10 text-brand-bright",
    warn: "border-warn/40 bg-warn/10 text-warn",
    danger: "border-danger/40 bg-danger/10 text-danger",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", tones[tone])}>
      {children}
    </span>
  );
}

export function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <p className="mb-4 text-sm text-fg-muted">{title}</p>
      {action}
    </div>
  );
}
