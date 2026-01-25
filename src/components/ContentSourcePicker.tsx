import { Image, Video, FileText, Bookmark, Music, Phone, Link, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileTypeFilter } from '@/lib/contentResolver';

export type ContactMode = 'dial' | 'message';

interface ContentSourcePickerProps {
  onSelectFile: (filter: FileTypeFilter) => void;
  onSelectContact?: (mode: ContactMode) => void;
  onSelectFromLibrary?: () => void;
  onEnterUrl?: () => void;
}

export function ContentSourcePicker({ 
  onSelectFile, 
  onSelectContact, 
  onSelectFromLibrary, 
  onEnterUrl,
}: ContentSourcePickerProps) {
  return (
    <div className="flex flex-col gap-4 p-5 pb-24 animate-fade-in">
      {/* Main Card: Create a Shortcut */}
      <div className="rounded-2xl bg-card elevation-1 p-4">
        <h2 className="text-base font-medium text-foreground mb-4">
          Create a shortcut
        </h2>
        
        {/* Primary Grid: 3x2 layout */}
        <div className="grid grid-cols-3 gap-3">
          <GridButton
            icon={<Image className="h-5 w-5" />}
            label="Photo"
            onClick={() => onSelectFile('image')}
          />
          <GridButton
            icon={<Video className="h-5 w-5" />}
            label="Video"
            onClick={() => onSelectFile('video')}
          />
          <GridButton
            icon={<Music className="h-5 w-5" />}
            label="Audio"
            onClick={() => onSelectFile('audio')}
          />
          <GridButton
            icon={<FileText className="h-5 w-5" />}
            label="Document"
            onClick={() => onSelectFile('document')}
          />
          {onSelectContact && (
            <GridButton
              icon={<Phone className="h-5 w-5" />}
              label="Contact"
              onClick={() => onSelectContact('dial')}
            />
          )}
          {onEnterUrl && (
            <GridButton
              icon={<Link className="h-5 w-5" />}
              label="Link"
              onClick={onEnterUrl}
            />
          )}
        </div>
        
        {/* Divider */}
        <div className="h-px bg-border my-4" />
        
        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <SecondaryButton
            icon={<FolderOpen className="h-4 w-4" />}
            label="Browse all files"
            onClick={() => onSelectFile('all')}
          />
          {onSelectFromLibrary && (
            <SecondaryButton
              icon={<Bookmark className="h-4 w-4" />}
              label="Saved bookmarks"
              onClick={onSelectFromLibrary}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface GridButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function GridButton({ icon, label, onClick }: GridButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl bg-muted/40 p-4",
        "shadow-sm active:scale-[0.96] transition-transform",
        "focus:outline-none focus:ring-2 focus:ring-ring"
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );
}

interface SecondaryButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function SecondaryButton({ icon, label, onClick }: SecondaryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl bg-muted/20 px-3 py-2.5",
        "active:scale-[0.98] transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-ring"
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </button>
  );
}

interface FileTypeButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function FileTypeButton({ icon, label, onClick }: FileTypeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3",
        "shadow-sm active:scale-[0.98] transition-transform",
        "focus:outline-none focus:ring-2 focus:ring-ring"
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}
