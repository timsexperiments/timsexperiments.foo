import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'astro:content';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

type SubscriptionFormProps = { onSubmit?: () => void | Promise<void> };

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  agree: z.boolean().refine((arg) => arg === true, 'Required'),
});

export function SubscriptionForm({
  onSubmit: afterSubmit,
}: SubscriptionFormProps) {
  const [error, setError] = useState<string>();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  function onSubmit(values: z.infer<typeof schema>) {
    fetch('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(values),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(async (res) => {
        if (res.status >= 400 && res.status !== 409) {
          const { message } = await res.json();
          throw new Error(message);
        }

        setError(undefined);
        afterSubmit && afterSubmit();
      })
      .catch((error) => {
        console.error(`An error occurred: ${error}`);
        setError(
          'An unknown error occurred while attempting to subscribe. Please try again later.'
        );
      });
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DialogHeader>
          <DialogTitle>Subscribe to Tim's Experiements</DialogTitle>
          <DialogDescription className="pb-8">
            Fill out your information to get email on the latest updates and
            article drops for Tim's Experiments!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-8 pb-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What should we call you?</FormLabel>
                <FormControl>
                  <Input placeholder="Tim" {...field} />
                </FormControl>
                <FormDescription>This how we will address you.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enter your email</FormLabel>
                <FormControl>
                  <Input placeholder="hello@timsexperiments.foo" {...field} />
                </FormControl>
                <FormDescription>
                  This is where we'll contact you.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="agree"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    I agree to receive emails from Tim's Experiments.
                  </FormLabel>
                  <FormDescription>
                    You can always unsubscribe later through this{' '}
                    <a
                      className="text-primary-600 underline dark:text-primary-500"
                      href="/unsubscribe">
                      link
                    </a>
                    .
                  </FormDescription>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {error && error.length && (
            <p className="text-sm font-medium text-red-500 dark:text-red-900">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button>Subscribe</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
