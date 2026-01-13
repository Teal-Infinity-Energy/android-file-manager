import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Folder, File, Film, Image, FileText, ChevronRight, Home, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import ShortcutPlugin from '@/plugins/ShortcutPlugin';
import { cn } from '@/lib/utils';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mimeType?: string;
}

// Common storage roots on Android
const STORAGE_ROOTS = [
  { name: 'Internal Storage', path: '/storage/emulated/0' },
  { name: 'Downloads', path: '/storage/emulated/0/Download' },
  { name: 'DCIM', path: '/storage/emulated/0/DCIM' },
  { name: 'Movies', path: '/storage/emulated/0/Movies' },
  { name: 'Pictures', path: '/storage/emulated/0/Pictures' },
  { name: 'Documents', path: '/storage/emulated/0/Documents' },
];

export default function FileBrowser() {
  const navigate = useNavigate();
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Request storage permission on mount
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setError('File browser is only available on Android');
      return;
    }

    (async () => {
      try {
        const result = await ShortcutPlugin.requestStoragePermission();
        setPermissionGranted(result.granted);
        if (!result.granted) {
          setError('Storage permission is required to browse files');
        }
      } catch (e) {
        console.error('[FileBrowser] Permission request failed:', e);
        setError('Failed to request storage permission');
      }
    })();
  }, []);

  // Load directory contents when path changes
  useEffect(() => {
    if (!permissionGranted || currentPath === null) return;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await ShortcutPlugin.listDirectory({ path: currentPath });
        if (result.success && result.files) {
          // Sort: directories first, then files, alphabetically
          const sorted = [...result.files].sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
              return a.isDirectory ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });
          setFiles(sorted);
        } else {
          setError(result.error || 'Failed to list directory');
          setFiles([]);
        }
      } catch (e) {
        console.error('[FileBrowser] listDirectory failed:', e);
        setError('Failed to list directory');
        setFiles([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPath, permissionGranted]);

  const handleFileSelect = (file: FileItem) => {
    if (file.isDirectory) {
      setCurrentPath(file.path);
    } else {
      // Navigate to customizer with selected file
      const params = new URLSearchParams({
        path: file.path,
        name: file.name,
        size: String(file.size),
        mimeType: file.mimeType || '',
      });
      navigate(`/?fromBrowser=true&${params.toString()}`);
    }
  };

  const handleGoUp = () => {
    if (!currentPath) return;
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    if (parentPath && parentPath !== '/storage/emulated') {
      setCurrentPath(parentPath);
    } else {
      setCurrentPath(null); // Back to roots
    }
  };

  const handleRefresh = () => {
    if (currentPath) {
      // Re-trigger useEffect
      const p = currentPath;
      setCurrentPath(null);
      setTimeout(() => setCurrentPath(p), 0);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFileIcon = (file: FileItem) => {
    if (file.isDirectory) {
      return <Folder className="h-6 w-6 text-amber-500" />;
    }

    const mime = file.mimeType || '';
    if (mime.startsWith('video/')) {
      return <Film className="h-6 w-6 text-primary" />;
    }
    if (mime.startsWith('image/')) {
      return <Image className="h-6 w-6 text-green-500" />;
    }
    if (mime.startsWith('text/') || mime.includes('pdf') || mime.includes('document')) {
      return <FileText className="h-6 w-6 text-blue-500" />;
    }
    return <File className="h-6 w-6 text-muted-foreground" />;
  };

  // Breadcrumb parts
  const breadcrumbParts = currentPath
    ? currentPath.replace('/storage/emulated/0', 'Internal').split('/').filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-2 p-4 border-b border-border bg-card sticky top-0 z-10">
        <button
          onClick={() => (currentPath ? handleGoUp() : navigate('/'))}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground truncate">
            {currentPath ? breadcrumbParts[breadcrumbParts.length - 1] || 'Files' : 'Browse Files'}
          </h1>
          {currentPath && breadcrumbParts.length > 1 && (
            <p className="text-xs text-muted-foreground truncate">
              {breadcrumbParts.slice(0, -1).join(' / ')}
            </p>
          )}
        </div>

        {currentPath && (
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Refresh"
            disabled={loading}
          >
            <RefreshCw className={cn('h-5 w-5 text-muted-foreground', loading && 'animate-spin')} />
          </button>
        )}

        {currentPath && (
          <button
            onClick={() => setCurrentPath(null)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Go to roots"
          >
            <Home className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </header>

      {/* Error state */}
      {error && (
        <div className="m-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Permission not granted */}
      {permissionGranted === false && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Folder className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="font-semibold text-lg mb-2">Storage Permission Required</h2>
          <p className="text-muted-foreground mb-4">
            Grant storage access to browse your files
          </p>
          <button
            onClick={async () => {
              const result = await ShortcutPlugin.requestStoragePermission();
              setPermissionGranted(result.granted);
              if (!result.granted) {
                setError('Permission denied. Please enable in Settings.');
              }
            }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            Grant Permission
          </button>
        </div>
      )}

      {/* Root folders selection */}
      {currentPath === null && permissionGranted && (
        <div className="flex-1 p-4">
          <p className="text-sm text-muted-foreground mb-3">Quick Access</p>
          <div className="space-y-2">
            {STORAGE_ROOTS.map((root) => (
              <button
                key={root.path}
                onClick={() => setCurrentPath(root.path)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-muted transition-colors text-left"
              >
                <Folder className="h-6 w-6 text-amber-500" />
                <span className="flex-1 font-medium text-foreground">{root.name}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File list */}
      {currentPath !== null && permissionGranted && (
        <div className="flex-1 overflow-auto">
          {loading && files.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Folder className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Folder is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => handleFileSelect(file)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{file.name}</p>
                    {!file.isDirectory && file.size > 0 && (
                      <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                    )}
                  </div>
                  {file.isDirectory && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
