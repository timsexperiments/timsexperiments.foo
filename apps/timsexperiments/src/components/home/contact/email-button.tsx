import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Mail } from 'lucide-react';

export const EmailButton = ({ email }: { email: string }) => (
  <Button
    size="sm"
    onClick={() => {
      navigator.clipboard.writeText('hello@timsexperiments.foo');
      toast({
        description: `${email} copied to clipboard.`,
      });
    }}>
    <Mail />
  </Button>
);

export default EmailButton;
