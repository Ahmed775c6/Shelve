interface Window {
  windowControls?: {
    minimize: () => Promise<boolean>;
    toggleMaximize: () => Promise<boolean>;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeState: (callback: (isMaximized: boolean) => void) => () => void;
    openReadingPlanner: () => Promise<boolean>;
    openEditBook: (bookId: string) => Promise<boolean>;
    quit: () => Promise<boolean>;
    captureScreenshot: () => Promise<string | null>;
    showNotification: (title: string, body: string) => Promise<boolean>;
  };
}
