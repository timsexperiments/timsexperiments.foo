import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-rhino-100 dark:bg-rhino-800',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
