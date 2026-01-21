import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Bookmark, Folder, Trash2, Calendar, AlertTriangle, Merge, Replace } from 'lucide-react';
import { BackupData, BackupStats } from '@/lib/backupManager';

interface ImportBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backupData: BackupData | null;
  stats: BackupStats | null;
  onImport: (mode: 'merge' | 'replace') => void;
}

export function ImportBackupDialog({
  open,
  onOpenChange,
  backupData,
  stats,
  onImport,
}: ImportBackupDialogProps) {
  const [showReplaceWarning, setShowReplaceWarning] = useState(false);

  if (!backupData || !stats) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleReplace = () => {
    setShowReplaceWarning(true);
  };

  const confirmReplace = () => {
    setShowReplaceWarning(false);
    onImport('replace');
  };

  if (showReplaceWarning) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Replace All Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              This will permanently delete all your current bookmarks, folders, and trash items, 
              replacing them with the backup data.
              <br /><br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowReplaceWarning(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReplace}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Replace All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Import Backup</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Found backup data. Choose how to import:
              </p>

              {/* Backup Stats */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Bookmark className="h-4 w-4 text-primary" />
                  <span className="text-foreground">{stats.bookmarkCount} bookmarks</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Folder className="h-4 w-4 text-primary" />
                  <span className="text-foreground">{stats.folderCount} custom folders</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{stats.trashCount} items in trash</span>
                </div>
                <div className="flex items-center gap-3 text-sm pt-2 border-t">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Exported {formatDate(stats.exportDate)}
                  </span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => onImport('merge')}
            variant="default"
            className="w-full justify-start gap-3 h-auto py-3"
          >
            <Merge className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Merge</div>
              <div className="text-xs opacity-80 font-normal">
                Add new bookmarks, keep existing ones
              </div>
            </div>
          </Button>

          <Button
            onClick={handleReplace}
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
          >
            <Replace className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Replace All</div>
              <div className="text-xs opacity-80 font-normal">
                Delete current data and restore backup
              </div>
            </div>
          </Button>
        </div>

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
