import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rhino-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-rhino-950 dark:focus-visible:ring-rhino-300',
  {
    variants: {
      variant: {
        default:
          'bg-primary-600 text-rhino-50 hover:bg-primary-600/90 dark:bg-primary-500 dark:text-rhino-900 dark:hover:bg-primary-500/90 focus-visible:ring-primary-600 dark:focus-visible:ring-primary-500',
        destructive:
          'bg-red-500 text-rhino-50 hover:bg-red-500/90 dark:bg-red-900 dark:text-rhino-50 dark:hover:bg-red-900/90',
        outline:
          'border border-rhino-200 hover:bg-rhino-100 hover:text-rhino-900 dark:border-rhino-800 dark:hover:bg-rhino-900 dark:hover:text-rhino-50',
        secondary:
          'dark:bg-rhino-200 dark:text-rhino-900 dark:hover:bg-rhino-200/80 bg-rhino-800 text-rhino-50 hover:bg-rhino-800/80',
        ghost:
          'hover:bg-rhino-100 hover:text-rhino-900 dark:hover:bg-rhino-800 dark:hover:text-rhino-50',
        link: 'text-primary-600 underline-offset-4 hover:underline dark:text-primary-500',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
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
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
