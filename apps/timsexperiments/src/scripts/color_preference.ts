import { COLOR_PREFERENCE_KEY } from '@/consts';

const colorSelectionButton =
  document.querySelector<HTMLButtonElement>('#color-swap-btn');
const colorPreference = localStorage.getItem(COLOR_PREFERENCE_KEY);

if (!colorPreference || colorPreference === 'dark') {
  document.documentElement.classList.add('dark');
  localStorage.setItem(COLOR_PREFERENCE_KEY, 'dark');
} else {
  document.documentElement.classList.remove('dark');
  localStorage.setItem(COLOR_PREFERENCE_KEY, 'light');
}

colorSelectionButton?.addEventListener('click', () => {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem(COLOR_PREFERENCE_KEY, 'light');
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem(COLOR_PREFERENCE_KEY, 'dark');
  }
});

export {};
