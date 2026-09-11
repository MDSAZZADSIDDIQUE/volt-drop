import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, Ref } from 'react';
import { cn } from './cn.js';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
    // A visible focus ring in the focus colour, only for keyboard focus (WCAG 2.2: 2.4.7).
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
    // Disabled controls are exempt from contrast rules, and can't be clicked.
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border border-border bg-background text-foreground hover:bg-surface',
      },
      // At least 40 px tall: well over the 24 px minimum target size (WCAG 2.2: 2.5.8).
      size: {
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render the single child (for example a link) with button styling, instead of a `<button>`. */
  asChild?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * The button. By default it's a native `<button type="button">`, so keyboard activation, focus and
 * screen-reader semantics come from the platform, and it never submits a form by accident.
 */
export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = 'button',
  ref,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild) {
    return <Slot ref={ref} className={classes} {...props} />;
  }
  return <button ref={ref} type={type} className={classes} {...props} />;
}
