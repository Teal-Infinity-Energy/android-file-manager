/**
 * Cloud Sync Module
 * 
 * All sync operations MUST go through the guarded entry points:
 * - guardedSync() - Primary: bidirectional sync
 * - guardedUpload() - Recovery: upload-only
 * - guardedDownload() - Recovery: download-only
 * 
 * Direct calls to internal functions are forbidden and will be caught
 * at review time. The legacy exports are preserved for backward compatibility
 * but route through guards.
 */

import { supabase } from '@/integrations/supabase/client';
import { getSavedLinks, SavedLink, getTrashLinks, TrashedLink } from './savedLinksManager';
import { 
  validateSyncAttempt, 
  markSyncStarted, 
  markSyncCompleted,
  type SyncTrigger 
} from './syncGuard';
import { recordSync } from './syncStatusManager';

// ============================================================================
// Types
// ============================================================================

export interface CloudBookmark {
  id: string;
  user_id: string;
  entity_id: string;
  url: string;
  title: string | null;
  description: string | null;
  folder: string;
  favicon: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudTrashItem {
  id: string;
  user_id: string;
  entity_id: string;
  url: string;
  title: string | null;
  description: string | null;
  folder: string;
  deleted_at: string;
  retention_days: number;
  original_created_at: string;
  created_at: string;
  updated_at: string;
}

export interface GuardedSyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  error?: string;
  blocked?: boolean;
  blockReason?: string;
}

// ============================================================================
// GUARDED SYNC ENTRY POINTS
// All external sync calls MUST go through these functions
// ============================================================================

/**
 * PRIMARY SYNC ENTRY POINT
 * 
 * This is the ONLY function that should be called for normal sync operations.
 * It validates the sync attempt, runs bidirectional sync, and records results.
 * 
 * @param trigger - The type of sync trigger (manual, daily_auto)
 */
export async function guardedSync(trigger: SyncTrigger): Promise<GuardedSyncResult> {
  const validation = validateSyncAttempt(trigger);
  
  if (!validation.allowed) {
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      blocked: true,
      blockReason: validation.reason
    };
  }
  
  markSyncStarted(trigger);
  
  try {
    const result = await performBidirectionalSync();
    
    if (result.success) {
      recordSync(result.uploaded, result.downloaded);
    }
    
    markSyncCompleted(trigger, result.success);
    return result;
  } catch (error) {
    markSyncCompleted(trigger, false);
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      error: error instanceof Error ? error.message : 'Sync failed'
    };
  }
}

/**
 * RECOVERY: Upload-only sync
 * For use in recovery tools only - user explicitly chose this action
 */
export async function guardedUpload(): Promise<GuardedSyncResult> {
  const trigger: SyncTrigger = 'recovery_upload';
  const validation = validateSyncAttempt(trigger);
  
  if (!validation.allowed) {
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      blocked: true,
      blockReason: validation.reason
    };
  }
  
  markSyncStarted(trigger);
  
  try {
    const [bookmarkResult, trashResult] = await Promise.all([
      uploadBookmarksInternal(),
      uploadTrashInternal()
    ]);
    
    const success = bookmarkResult.success;
    if (success) {
      recordSync(bookmarkResult.uploaded + (trashResult.uploaded || 0), 0);
    }
    
    markSyncCompleted(trigger, success);
    
    return {
      success,
      uploaded: bookmarkResult.uploaded + (trashResult.uploaded || 0),
      downloaded: 0,
      error: bookmarkResult.error
    };
  } catch (error) {
    markSyncCompleted(trigger, false);
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * RECOVERY: Download-only sync
 * For use in recovery tools only - user explicitly chose this action
 */
export async function guardedDownload(): Promise<GuardedSyncResult> {
  const trigger: SyncTrigger = 'recovery_download';
  const validation = validateSyncAttempt(trigger);
  
  if (!validation.allowed) {
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      blocked: true,
      blockReason: validation.reason
    };
  }
  
  markSyncStarted(trigger);
  
  try {
    const [bookmarkResult, trashResult] = await Promise.all([
      downloadBookmarksInternal(),
      downloadTrashInternal()
    ]);
    
    const success = bookmarkResult.success;
    if (success) {
      recordSync(0, bookmarkResult.downloaded + (trashResult.downloaded || 0));
    }
    
    markSyncCompleted(trigger, success);
    
    return {
      success,
      uploaded: 0,
      downloaded: bookmarkResult.downloaded + (trashResult.downloaded || 0),
      error: bookmarkResult.error
    };
  } catch (error) {
    markSyncCompleted(trigger, false);
    return {
      success: false,
      uploaded: 0,
      downloaded: 0,
      error: error instanceof Error ? error.message : 'Download failed'
    };
  }
}

// ============================================================================
// INTERNAL SYNC FUNCTIONS
// These perform the actual sync work - NOT to be called directly
// ============================================================================

/**
 * Performs bidirectional sync: upload local → cloud, then download cloud → local
 * INTERNAL: Do not call directly - use guardedSync() instead
 */
async function performBidirectionalSync(): Promise<{ success: boolean; uploaded: number; downloaded: number; error?: string }> {
  const uploadResult = await uploadBookmarksInternal();
  if (!uploadResult.success) {
    return { success: false, uploaded: 0, downloaded: 0, error: uploadResult.error };
  }

  const trashUploadResult = await uploadTrashInternal();
  if (!trashUploadResult.success) {
    console.error('[CloudSync] Trash upload failed but continuing:', trashUploadResult.error);
  }

  const downloadResult = await downloadBookmarksInternal();
  if (!downloadResult.success) {
    return { success: false, uploaded: uploadResult.uploaded, downloaded: 0, error: downloadResult.error };
  }

  const trashDownloadResult = await downloadTrashInternal();
  if (!trashDownloadResult.success) {
    console.error('[CloudSync] Trash download failed but continuing:', trashDownloadResult.error);
  }

  return {
    success: true,
    uploaded: uploadResult.uploaded,
    downloaded: downloadResult.downloaded,
  };
}

/**
 * Upload local bookmarks to cloud
 * INTERNAL: Uses local ID as entity_id - local is source of truth for identity
 */
async function uploadBookmarksInternal(): Promise<{ success: boolean; uploaded: number; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, uploaded: 0, error: 'Not authenticated' };
    }

    const localBookmarks = getSavedLinks();
    let uploaded = 0;

    for (const bookmark of localBookmarks) {
      const { error } = await supabase
        .from('cloud_bookmarks')
        .upsert({
          entity_id: bookmark.id,
          user_id: user.id,
          url: bookmark.url,
          title: bookmark.title || null,
          description: bookmark.description || null,
          folder: bookmark.tag || 'Uncategorized',
          favicon: null,
          created_at: new Date(bookmark.createdAt).toISOString(),
        }, {
          onConflict: 'user_id,entity_id',
          ignoreDuplicates: false,
        });

      if (!error) {
        uploaded++;
      } else {
        console.warn('[CloudSync] Failed to upload bookmark:', bookmark.id, error.message);
      }
    }

    return { success: true, uploaded };
  } catch (error) {
    console.error('[CloudSync] Upload failed:', error);
    return { success: false, uploaded: 0, error: error instanceof Error ? error.message : 'Upload failed' };
  }
}

/**
 * Upload local trash to cloud
 * INTERNAL: Uses local ID as entity_id
 */
async function uploadTrashInternal(): Promise<{ success: boolean; uploaded: number; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, uploaded: 0, error: 'Not authenticated' };
    }

    const localTrash = getTrashLinks();
    let uploaded = 0;

    for (const item of localTrash) {
      const { error } = await supabase
        .from('cloud_trash')
        .upsert({
          entity_id: item.id,
          user_id: user.id,
          url: item.url,
          title: item.title || null,
          description: item.description || null,
          folder: item.tag || 'Uncategorized',
          deleted_at: new Date(item.deletedAt).toISOString(),
          retention_days: item.retentionDays,
          original_created_at: new Date(item.createdAt).toISOString(),
        }, {
          onConflict: 'user_id,entity_id',
          ignoreDuplicates: false,
        });

      if (!error) {
        uploaded++;
      } else {
        console.warn('[CloudSync] Failed to upload trash item:', item.id, error.message);
      }
    }

    return { success: true, uploaded };
  } catch (error) {
    console.error('[CloudSync] Trash upload failed:', error);
    return { success: false, uploaded: 0, error: error instanceof Error ? error.message : 'Trash upload failed' };
  }
}

/**
 * Download bookmarks from cloud to local storage
 * INTERNAL: Uses entity_id as local ID - never rewrites local IDs
 */
async function downloadBookmarksInternal(): Promise<{ success: boolean; downloaded: number; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, downloaded: 0, error: 'Not authenticated' };
    }

    const { data: cloudBookmarks, error } = await supabase
      .from('cloud_bookmarks')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    if (!cloudBookmarks || cloudBookmarks.length === 0) {
      return { success: true, downloaded: 0 };
    }

    const STORAGE_KEY = 'saved_links';
    const existingLinks = getSavedLinks();
    const existingIds = new Set(existingLinks.map(l => l.id));

    const newBookmarks: SavedLink[] = [];
    for (const cloudBookmark of cloudBookmarks) {
      const entityId = cloudBookmark.entity_id;
      
      if (!existingIds.has(entityId)) {
        newBookmarks.push({
          id: entityId,
          url: cloudBookmark.url,
          title: cloudBookmark.title || '',
          description: cloudBookmark.description || '',
          tag: cloudBookmark.folder === 'Uncategorized' ? null : cloudBookmark.folder,
          createdAt: new Date(cloudBookmark.created_at).getTime(),
          isShortlisted: false,
        });
        existingIds.add(entityId);
      }
    }

    if (newBookmarks.length > 0) {
      const mergedLinks = [...existingLinks, ...newBookmarks];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedLinks));
    }

    return { success: true, downloaded: newBookmarks.length };
  } catch (error) {
    console.error('[CloudSync] Download failed:', error);
    return { success: false, downloaded: 0, error: error instanceof Error ? error.message : 'Download failed' };
  }
}

/**
 * Download trash from cloud to local storage
 * INTERNAL: Uses entity_id as local ID
 */
async function downloadTrashInternal(): Promise<{ success: boolean; downloaded: number; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, downloaded: 0, error: 'Not authenticated' };
    }

    const { data: cloudTrash, error } = await supabase
      .from('cloud_trash')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    if (!cloudTrash || cloudTrash.length === 0) {
      return { success: true, downloaded: 0 };
    }

    const TRASH_STORAGE_KEY = 'saved_links_trash';
    const existingTrash = getTrashLinks();
    const existingIds = new Set(existingTrash.map(l => l.id));

    const newTrashItems: TrashedLink[] = [];
    for (const cloudItem of cloudTrash) {
      const entityId = cloudItem.entity_id;
      
      if (!existingIds.has(entityId)) {
        newTrashItems.push({
          id: entityId,
          url: cloudItem.url,
          title: cloudItem.title || '',
          description: cloudItem.description || '',
          tag: cloudItem.folder === 'Uncategorized' ? null : cloudItem.folder,
          createdAt: new Date(cloudItem.original_created_at).getTime(),
          isShortlisted: false,
          deletedAt: new Date(cloudItem.deleted_at).getTime(),
          retentionDays: cloudItem.retention_days,
        });
        existingIds.add(entityId);
      }
    }

    if (newTrashItems.length > 0) {
      const mergedTrash = [...existingTrash, ...newTrashItems];
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(mergedTrash));
    }

    return { success: true, downloaded: newTrashItems.length };
  } catch (error) {
    console.error('[CloudSync] Trash download failed:', error);
    return { success: false, downloaded: 0, error: error instanceof Error ? error.message : 'Trash download failed' };
  }
}

// ============================================================================
// LEGACY EXPORTS
// Preserved for backward compatibility - route through guards
// ============================================================================

/**
 * @deprecated Use guardedSync('manual') instead
 */
export async function syncBookmarks(): Promise<{ success: boolean; uploaded: number; downloaded: number; error?: string }> {
  console.warn('[CloudSync] syncBookmarks() is deprecated - use guardedSync() instead');
  return guardedSync('manual');
}

/**
 * @deprecated Use guardedUpload() instead
 */
export async function uploadBookmarksToCloud(): Promise<{ success: boolean; uploaded: number; error?: string }> {
  console.warn('[CloudSync] uploadBookmarksToCloud() is deprecated - use guardedUpload() instead');
  const result = await guardedUpload();
  return { success: result.success, uploaded: result.uploaded, error: result.error };
}

/**
 * @deprecated Use guardedDownload() instead
 */
export async function downloadBookmarksFromCloud(): Promise<{ success: boolean; downloaded: number; error?: string }> {
  console.warn('[CloudSync] downloadBookmarksFromCloud() is deprecated - use guardedDownload() instead');
  const result = await guardedDownload();
  return { success: result.success, downloaded: result.downloaded, error: result.error };
}

/**
 * @deprecated Use guardedUpload() instead
 */
export async function uploadTrashToCloud(): Promise<{ success: boolean; uploaded: number; error?: string }> {
  console.warn('[CloudSync] uploadTrashToCloud() is deprecated - use guardedUpload() instead');
  const result = await guardedUpload();
  return { success: result.success, uploaded: result.uploaded, error: result.error };
}

/**
 * @deprecated Use guardedDownload() instead
 */
export async function downloadTrashFromCloud(): Promise<{ success: boolean; downloaded: number; error?: string }> {
  console.warn('[CloudSync] downloadTrashFromCloud() is deprecated - use guardedDownload() instead');
  const result = await guardedDownload();
  return { success: result.success, downloaded: result.downloaded, error: result.error };
}

// ============================================================================
// CLOUD MANAGEMENT UTILITIES
// ============================================================================

/**
 * Delete all cloud bookmarks for the current user
 */
export async function clearCloudBookmarks(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('cloud_bookmarks')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('[CloudSync] Clear failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Clear failed' };
  }
}

/**
 * Delete all cloud trash for the current user
 */
export async function clearCloudTrash(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('cloud_trash')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('[CloudSync] Clear trash failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Clear trash failed' };
  }
}

/**
 * Get the count of cloud bookmarks for the current user
 */
export async function getCloudBookmarkCount(): Promise<number | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    const { count, error } = await supabase
      .from('cloud_bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return count ?? 0;
  } catch (error) {
    console.error('[CloudSync] Count failed:', error);
    return null;
  }
}

/**
 * Get the count of cloud trash for the current user
 */
export async function getCloudTrashCount(): Promise<number | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    const { count, error } = await supabase
      .from('cloud_trash')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return count ?? 0;
  } catch (error) {
    console.error('[CloudSync] Trash count failed:', error);
    return null;
  }
}
