import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export type ViewMode = 'desktop' | 'mobile';

// User Agent strings
const DESKTOP_USER_AGENT = 
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MOBILE_USER_AGENT = 
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

let browserCloseCallback: (() => void) | null = null;

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getUserAgent(viewMode: ViewMode): string {
  return viewMode === 'desktop' ? DESKTOP_USER_AGENT : MOBILE_USER_AGENT;
}

/**
 * Opens URL in native in-app browser.
 * Note: Chrome Custom Tabs and SFSafariViewController don't support
 * programmatic User-Agent changes. The viewMode is stored for user intent.
 */
export async function openInAppBrowser(url: string, viewMode: ViewMode = 'desktop'): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ 
      url,
      presentationStyle: 'fullscreen',
      toolbarColor: '#ffffff',
    });
  } else {
    // Web fallback - open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export async function closeInAppBrowser(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.close();
    } catch (error) {
      // Browser may already be closed
      console.log('Browser close error (may already be closed):', error);
    }
  }
}

export function addBrowserCloseListener(callback: () => void): void {
  browserCloseCallback = callback;
  if (Capacitor.isNativePlatform()) {
    Browser.addListener('browserFinished', () => {
      browserCloseCallback?.();
    });
  }
}

export function removeBrowserListeners(): void {
  browserCloseCallback = null;
  if (Capacitor.isNativePlatform()) {
    Browser.removeAllListeners();
  }
}
