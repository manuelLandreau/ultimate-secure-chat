import { cva } from 'class-variance-authority';

/**
 * Definition of button variants with class-variance-authority
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-error text-error-foreground hover:bg-error/90',
        outline: 'border border-border bg-transparent hover:bg-primary/10 text-foreground',
        secondary: 'bg-muted text-foreground hover:bg-muted/80',
        ghost: 'hover:bg-muted/50 text-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
); 