// Android присылает событие установки один раз и рано — до того, как
// человек дошёл до экрана установки. Держим его здесь, пока не понадобится.
type InstallEvent = Event & { prompt: () => Promise<void> };

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallEvent;
    listeners.forEach((fn) => fn());
  });
}

export const canPromptInstall = () => deferred !== null;

export const promptInstall = async () => {
  if (!deferred) return false;
  await deferred.prompt();
  deferred = null;
  listeners.forEach((fn) => fn());
  return true;
};

export const onInstallAvailability = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
