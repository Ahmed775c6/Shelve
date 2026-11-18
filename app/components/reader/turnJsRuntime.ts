export type TurnDisplay = 'single' | 'double';

export interface TurnOptions {
  width: number;
  height: number;
  display: TurnDisplay;
  direction: 'ltr' | 'rtl';
  duration: number;
  acceleration: boolean;
  gradients: boolean;
  elevation: number;
  autoCenter: boolean;
  turnCorners?: string;
  page: number;
  pages?: number;
  when: {
    turned: (_event: unknown, page: number) => void;
    missing?: (_event: unknown, pages: number[]) => void;
  };
}

export interface TurnBookInstance {
  turn(options: TurnOptions): TurnBookInstance;
  turn(method: 'page'): number;
  turn(method: 'page', page: number): TurnBookInstance;
  turn(method: 'addPage', page: HTMLElement, pageNumber: number): TurnBookInstance;
  turn(method: 'size', width: number, height: number): TurnBookInstance;
  turn(method: 'display', display: TurnDisplay): TurnBookInstance;
  turn(method: 'destroy'): TurnBookInstance;
}

export interface TurnJQuery {
  (element: HTMLElement): TurnBookInstance;
  fn: { turn?: unknown };
}

declare global {
  interface Window {
    jQuery?: TurnJQuery;
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-turnjs-src="${src}"]`);
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.src = src;
      script.async = true;
      script.dataset.turnjsSrc = src;
      document.head.appendChild(script);
    }

    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error(`Unable to load ${src}`));
    }, { once: true });
  });
}

let turnLibraryPromise: Promise<TurnJQuery> | null = null;

export function loadTurnLibrary() {
  const existingJQuery = typeof window === 'undefined' ? undefined : window.jQuery;
  if (existingJQuery?.fn.turn) return Promise.resolve(existingJQuery);

  if (!turnLibraryPromise) {
    turnLibraryPromise = (async () => {
      await loadScript('/vendor/turnjs/jquery.js');
      await loadScript('/vendor/turnjs/turn.js');
      const jquery = window.jQuery;
      if (!jquery?.fn.turn) {
        throw new Error('Turn.js did not initialize correctly.');
      }
      return jquery;
    })().catch((error: unknown) => {
      turnLibraryPromise = null;
      throw error;
    });
  }

  return turnLibraryPromise;
}
