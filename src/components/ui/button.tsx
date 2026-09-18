import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

import { cn } from "@/lib/utils";

type Variant = "light" | "dark" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export function buttonStyles({
  variant = "light",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(
    "group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.16em] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-45",
    {
      "border-paper bg-paper text-ink hover:bg-white": variant === "light",
      "border-ink bg-ink text-paper hover:bg-ink-3": variant === "dark",
      "border-white/20 bg-transparent text-paper hover:border-white/50 hover:bg-white/[0.05]":
        variant === "outline",
      "border-transparent bg-transparent text-current hover:bg-white/[0.06]":
        variant === "ghost",
      "min-h-10 px-4 text-[0.65rem]": size === "sm",
      "min-h-12 px-6": size === "md",
      "min-h-14 px-7 text-[0.76rem]": size === "lg",
    },
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button className={buttonStyles({ variant, size, className })} {...props} />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonStyles({ variant, size, className })} {...props} />
  );
}
