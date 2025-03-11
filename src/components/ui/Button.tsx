import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { buttonVariants } from './buttonVariants';

/**
 * Button component properties interface
 */
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

/**
 * Adaptable Button component for various uses
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button }; 