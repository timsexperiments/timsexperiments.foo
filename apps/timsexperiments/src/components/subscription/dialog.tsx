import { SubscriptionForm } from '@/components/subscription/form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';

type DialogProps = { children?: React.ReactNode };

export function SubscriptionDialog({ children }: DialogProps) {
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setStep(1);
        }
      }}>
      <DialogTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-pointer text-primary-600 underline dark:text-primary-500">
          {children}
        </span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        {step === 1 && <SubscriptionForm onSubmit={() => setStep(2)} />}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="">
                Successfully subscribed to Tim's Experiments!
              </DialogTitle>
              <DialogDescription>
                Congradulations! You have been successfully subscribed to Tim's
                Experiments. Keep an eye out for emails about new content and
                other fun stuff!
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button size="sm">Close</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
