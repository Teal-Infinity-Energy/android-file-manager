import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import ShortcutPlugin from '@/plugins/ShortcutPlugin';

/**
 * Hook to detect when the app is launched from the Quick Create widget.
 * Calls the provided callback when Quick Create is detected.
 */
export function useQuickCreateWidget(onQuickCreate: () => void) {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Only check once per app launch
    if (hasChecked.current) {
      return;
    }

    const checkQuickCreate = async () => {
      try {
        const result = await ShortcutPlugin.checkQuickCreateIntent();
        
        if (result.quickCreate) {
          console.log('[useQuickCreateWidget] Quick Create widget detected, triggering callback');
          hasChecked.current = true;
          onQuickCreate();
        }
      } catch (error) {
        console.error('[useQuickCreateWidget] Error checking quick create intent:', error);
      }
    };

    // Small delay to ensure app is fully loaded
    const timeout = setTimeout(checkQuickCreate, 300);

    return () => clearTimeout(timeout);
  }, [onQuickCreate]);

  // Reset check flag when callback changes (e.g., navigating back)
  useEffect(() => {
    return () => {
      hasChecked.current = false;
    };
  }, []);
}
