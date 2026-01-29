import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import ShortcutPlugin from '@/plugins/ShortcutPlugin';

/**
 * Hook to detect and handle pending shortcut edit requests.
 * This is triggered when a user long-presses a shortcut on the home screen
 * and selects "Edit" from the menu.
 */
export function usePendingShortcutEdit() {
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);

  useEffect(() => {
    async function checkPendingEdit() {
      if (!Capacitor.isNativePlatform()) return;
      
      try {
        const result = await ShortcutPlugin.getPendingEditShortcut();
        if (result.success && result.shortcutId) {
          console.log('[usePendingShortcutEdit] Found pending edit for:', result.shortcutId);
          setPendingEditId(result.shortcutId);
          // Clear immediately to prevent re-triggering
          await ShortcutPlugin.clearPendingEditShortcut();
        }
      } catch (error) {
        console.warn('[usePendingShortcutEdit] Failed to check pending edit:', error);
      }
    }
    
    checkPendingEdit();
  }, []);

  const clearPendingEdit = useCallback(() => {
    setPendingEditId(null);
  }, []);

  return { pendingEditId, clearPendingEdit };
}
