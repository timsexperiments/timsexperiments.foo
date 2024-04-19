import { toast } from '@/components/ui/use-toast';

function main() {
  const allHeadingLinkButtons = document.querySelectorAll<HTMLButtonElement>(
    'button[data-heading-link]'
  );
  for (const element of allHeadingLinkButtons) {
    const id = element.parentElement!.id ?? '';
    const link = window.location.origin + window.location.pathname + '#' + id;
    element?.addEventListener('click', () => {
      window.navigator.clipboard.writeText(link);
      toast({
        description: 'Link copied',
        className: 'w-fit m-auto top-0 m-4 p-2 fixed left-1/2 -translate-x-1/2',
      });
    });
  }
}

main();
