export const isBrowser = () => typeof window !== 'undefined';

export const isIOS = () =>
  isBrowser() &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS притворяется маком — отличаем по тачскрину
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export const isAndroid = () =>
  isBrowser() && /Android/i.test(navigator.userAgent);

export const isStandalone = () =>
  isBrowser() &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    // Safari на iOS не поддерживает display-mode в старых версиях
    (navigator as Navigator & { standalone?: boolean }).standalone === true);
