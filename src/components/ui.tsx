import Link from "next/link";
import { cn } from "@/lib/utils";

/* Shared UI kit — server-component friendly primitives.
   Interactive widgets (modals, sliders) live in their feature folders. */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-saffron-600 text-white hover:bg-saffron-700 focus-visible:outline-saffron-600 shadow-sm",
  secondary:
    "bg-white text-saffron-800 ring-1 ring-saffron-300 hover:bg-saffron-50 focus-visible:outline-saffron-600",
  danger: "bg-maroon-700 text-white hover:bg-maroon-800 focus-visible:outline-maroon-700",
  ghost: "text-saffron-800 hover:bg-saffron-100",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={cn(buttonBase, buttonStyles[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  href,
  children,
}: {
  variant?: ButtonVariant;
  className?: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(buttonBase, buttonStyles[variant], className)}>
      {children}
    </Link>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl bg-white p-5 shadow-sm ring-1 ring-saffron-900/10", className)}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-saffron-950">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-saffron-900/70">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const badgeTones = {
  saffron: "bg-saffron-100 text-saffron-800 ring-saffron-600/20",
  green: "bg-green-100 text-green-800 ring-green-600/20",
  red: "bg-maroon-100 text-maroon-800 ring-maroon-600/20",
  gray: "bg-stone-100 text-stone-700 ring-stone-500/20",
  blue: "bg-sky-100 text-sky-800 ring-sky-600/20",
} as const;

export function Badge({
  tone = "saffron",
  className,
  children,
}: {
  tone?: keyof typeof badgeTones;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const inputStyles =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-saffron-950 shadow-sm ring-1 ring-inset ring-saffron-900/20 placeholder:text-stone-400 focus:ring-2 focus:ring-inset focus:ring-saffron-600";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputStyles, className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputStyles, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputStyles, className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1 block text-sm font-medium text-saffron-950", className)} {...props} />
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

/* Table primitives */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-saffron-900/10">
      <table className={cn("min-w-full divide-y divide-saffron-900/10 text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-saffron-900/70",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 text-saffron-950", className)} {...props} />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-saffron-300 bg-saffron-50/50 p-10 text-center">
      <p className="text-sm font-medium text-saffron-900">{title}</p>
      {hint ? <p className="mt-1 text-xs text-saffron-900/60">{hint}</p> : null}
    </div>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-saffron-900/60">{label}</p>
      <p className="mt-1 text-3xl font-bold text-saffron-950">{value}</p>
      {sub ? <p className="mt-1 text-xs text-stone-500">{sub}</p> : null}
    </Card>
  );
}
