import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "link";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rzp/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed";
const variants: Record<Variant, string> = {
  primary: "bg-rzp text-white hover:bg-rzp-hover disabled:bg-[#9DBFF7]",
  secondary: "border border-line bg-white text-ink hover:bg-[#F3F4F6] disabled:text-ink-3",
  ghost: "text-ink-2 hover:bg-[#EEF0F2] hover:text-ink disabled:text-ink-3",
  link: "text-rzp hover:underline underline-offset-2 disabled:text-ink-3 px-0",
};
const sizes: Record<Size, string> = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm" };

export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${variant === "link" ? "text-sm" : sizes[size]} ${extra}`;
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function PrimaryButton(props: ComponentProps<"button"> & { size?: Size }) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: ComponentProps<"button"> & { size?: Size }) {
  return <Button variant="secondary" {...props} />;
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
