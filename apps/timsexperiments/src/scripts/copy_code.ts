import { toast } from '@/components/ui/use-toast';

function main() {
  const allCopyItems = document.querySelectorAll('div[data-code-block');
  for (const element of allCopyItems) {
    const copyButton = element.querySelector('button');
    const copyText = element.querySelector('pre')?.innerText ?? '';

    copyButton?.addEventListener('click', () => {
      window.navigator.clipboard.writeText(copyText);
      toast({
        description: 'Copied to clipboard',
        className: 'w-fit m-auto top-0 m-4 p-2 fixed left-1/2 -translate-x-1/2',
      });
    });
  }
}

main();
