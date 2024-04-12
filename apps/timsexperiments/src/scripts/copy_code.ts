import { toast } from '@/components/ui/use-toast';

function main() {
  const allCopyItems = document.querySelectorAll('div[data-code-block');
  console.log(allCopyItems);
  for (const element of allCopyItems) {
    const copyButton = element.querySelector('button');
    const copyText = element.querySelector('pre')?.innerText ?? '';

    copyButton?.addEventListener('click', () => {
      console.log('clicked...', copyText);
      window.navigator.clipboard.writeText(copyText);
      toast({ description: 'Copied to clipboard' });
    });
  }
}

main();
