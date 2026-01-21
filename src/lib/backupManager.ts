import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { 
  getSavedLinks, 
  getTrashLinks, 
  getCustomFolders, 
  getFolderIcons,
  SavedLink,
  TrashedLink,
  normalizeUrl
} from './savedLinksManager';
import { getSettings } from './settingsManager';

const BACKUP_VERSION = 1;

// Re-export settings type for backup purposes
export type BackupSettings = ReturnType<typeof getSettings>;

export interface BackupData {
  version: number;
  exportedAt: number;
  appName: string;
  data: {
    bookmarks: SavedLink[];
    trash: TrashedLink[];
    customFolders: string[];
    folderIcons: Record<string, string>;
    settings: BackupSettings;
  };
}

export interface BackupStats {
  bookmarkCount: number;
  trashCount: number;
  folderCount: number;
  exportDate: Date;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  error?: string;
}

/**
 * Generate a timestamped backup filename
 */
export function generateBackupFilename(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `onetap-backup-${dateStr}.json`;
}

/**
 * Collect all app data into a backup object
 */
export function createBackupData(): BackupData {
  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    appName: 'OneTap Shortcuts',
    data: {
      bookmarks: getSavedLinks(),
      trash: getTrashLinks(),
      customFolders: getCustomFolders(),
      folderIcons: getFolderIcons(),
      settings: getSettings(),
    },
  };
}

/**
 * Validate backup file structure
 */
export function validateBackupData(data: unknown): { valid: boolean; error?: string; stats?: BackupStats } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid file format' };
  }

  const backup = data as Partial<BackupData>;

  if (!backup.version || typeof backup.version !== 'number') {
    return { valid: false, error: 'Missing or invalid version' };
  }

  if (backup.version > BACKUP_VERSION) {
    return { valid: false, error: 'Backup version is newer than app. Please update the app.' };
  }

  if (!backup.data || typeof backup.data !== 'object') {
    return { valid: false, error: 'Missing backup data' };
  }

  if (!Array.isArray(backup.data.bookmarks)) {
    return { valid: false, error: 'Invalid bookmarks data' };
  }

  const stats: BackupStats = {
    bookmarkCount: backup.data.bookmarks?.length || 0,
    trashCount: backup.data.trash?.length || 0,
    folderCount: backup.data.customFolders?.length || 0,
    exportDate: new Date(backup.exportedAt || 0),
  };

  return { valid: true, stats };
}

/**
 * Export bookmarks - handles both web and native
 */
export async function exportBookmarks(): Promise<{ success: boolean; error?: string }> {
  try {
    const backupData = createBackupData();
    const jsonString = JSON.stringify(backupData, null, 2);
    const filename = generateBackupFilename();

    if (Capacitor.isNativePlatform()) {
      // Native: Save to cache then share
      await Filesystem.writeFile({
        path: filename,
        data: jsonString,
        directory: Directory.Cache,
      });

      const fileUri = await Filesystem.getUri({
        path: filename,
        directory: Directory.Cache,
      });

      await Share.share({
        title: 'OneTap Backup',
        text: 'OneTap Shortcuts backup file',
        url: fileUri.uri,
        dialogTitle: 'Save or share backup',
      });

      return { success: true };
    } else {
      // Web: Download via blob
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    }
  } catch (error) {
    console.error('[Backup] Export failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
  }
}

/**
 * Import bookmarks with merge or replace mode
 */
export function importBookmarks(
  backup: BackupData,
  mode: 'merge' | 'replace'
): ImportResult {
  try {
    const STORAGE_KEY = 'saved_links';
    const TRASH_STORAGE_KEY = 'saved_links_trash';
    const CUSTOM_FOLDERS_KEY = 'custom_folders';
    const FOLDER_ICONS_KEY = 'folder_icons';
    const SETTINGS_KEY = 'onetap_settings';

    let imported = 0;
    let skipped = 0;

    if (mode === 'replace') {
      // Clear and replace all data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.data.bookmarks || []));
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(backup.data.trash || []));
      localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(backup.data.customFolders || []));
      localStorage.setItem(FOLDER_ICONS_KEY, JSON.stringify(backup.data.folderIcons || {}));
      
      // Merge settings (keep some local preferences)
      if (backup.data.settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.data.settings));
      }

      imported = backup.data.bookmarks?.length || 0;
    } else {
      // Merge mode: Add new bookmarks, skip duplicates
      const existingLinks = getSavedLinks();
      const existingUrls = new Set(existingLinks.map(l => normalizeUrl(l.url)));

      const newBookmarks = (backup.data.bookmarks || []).filter(bookmark => {
        const normalized = normalizeUrl(bookmark.url);
        if (existingUrls.has(normalized)) {
          skipped++;
          return false;
        }
        existingUrls.add(normalized);
        imported++;
        return true;
      });

      const mergedLinks = [...existingLinks, ...newBookmarks];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedLinks));

      // Merge custom folders (add new ones)
      const existingFolders = new Set(getCustomFolders());
      const newFolders = (backup.data.customFolders || []).filter(f => !existingFolders.has(f));
      if (newFolders.length > 0) {
        const mergedFolders = [...getCustomFolders(), ...newFolders];
        localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(mergedFolders));
      }

      // Merge folder icons (add missing)
      const existingIcons = getFolderIcons();
      const backupIcons = backup.data.folderIcons || {};
      const mergedIcons = { ...backupIcons, ...existingIcons }; // existing takes priority
      localStorage.setItem(FOLDER_ICONS_KEY, JSON.stringify(mergedIcons));
    }

    return { success: true, imported, skipped };
  } catch (error) {
    console.error('[Backup] Import failed:', error);
    return { 
      success: false, 
      imported: 0, 
      skipped: 0, 
      error: error instanceof Error ? error.message : 'Import failed' 
    };
  }
}

/**
 * Parse a backup file from string content
 */
export function parseBackupFile(content: string): { data?: BackupData; error?: string } {
  try {
    const parsed = JSON.parse(content);
    const validation = validateBackupData(parsed);
    
    if (!validation.valid) {
      return { error: validation.error };
    }

    return { data: parsed as BackupData };
  } catch {
    return { error: 'Invalid JSON file' };
  }
}
