import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

/**
 * Interface pour les propriétés du champ de saisie
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  fullWidth?: boolean;
}

/**
 * Composant Input réutilisable
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, fullWidth = false, type, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1', fullWidth ? 'w-full' : '')}>
        <input
          type={type}
          className={cn(
            'px-3 py-2 rounded-md border border-border text-foreground bg-background transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-error focus:ring-error' : '',
            fullWidth ? 'w-full' : '',
            className
          )}
          ref={ref}
          {...props}
        />
        {error ? <p className="text-sm text-error">{error}</p> : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input }; 