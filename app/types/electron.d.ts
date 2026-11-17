interface Window {
  windowControls?: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeState: (callback: (isMaximized: boolean) => void) => () => void;
  };
}
