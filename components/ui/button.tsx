import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-500 text-zinc-950 font-semibold shadow-md shadow-cyan-500/20 hover:bg-cyan-400 hover:shadow-cyan-500/30",
        destructive:
          "bg-red-600/90 text-white shadow-sm hover:bg-red-500",
        outline:
          "border border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/80 hover:text-white hover:border-zinc-700",
        secondary:
          "bg-zinc-800 text-zinc-200 hover:bg-zinc-700/80 hover:text-white",
        ghost: "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100",
        link: "text-cyan-400 underline-offset-4 hover:underline",
        neon: "border border-cyan-500/50 bg-cyan-950/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:bg-cyan-900/50 hover:border-cyan-400 hover:text-cyan-100",
        purple: "border border-violet-500/50 bg-violet-950/40 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.25)] hover:bg-violet-900/50 hover:border-violet-400 hover:text-violet-100",
        emerald: "border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:bg-emerald-900/50 hover:border-emerald-400 hover:text-emerald-100",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
