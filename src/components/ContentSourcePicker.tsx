import { useState } from 'react';
import { Image, Video, FileText, Bookmark, Music, Phone, Link, FolderOpen, MessageCircle, X } from 'lucide-react';
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
  const [showContactPicker, setShowContactPicker] = useState(false);

  const handleContactSelect = (mode: ContactMode) => {
    setShowContactPicker(false);
    onSelectContact?.(mode);
  };

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
              onClick={() => setShowContactPicker(true)}
              isActive={showContactPicker}
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

        {/* Contact Mode Picker - Inline expansion */}
        {showContactPicker && (
          <div className="mt-3 rounded-xl bg-muted/30 p-3 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Choose action type</span>
              <button
                onClick={() => setShowContactPicker(false)}
                className="p-1 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ContactModeButton
                icon={<Phone className="h-4 w-4" />}
                label="Call"
                description="Direct dial"
                onClick={() => handleContactSelect('dial')}
              />
              <ContactModeButton
                icon={<MessageCircle className="h-4 w-4" />}
                label="Message"
                description="WhatsApp"
                onClick={() => handleContactSelect('message')}
              />
            </div>
          </div>
        )}
        
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
  isActive?: boolean;
}

function GridButton({ icon, label, onClick, isActive }: GridButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl p-4",
        "shadow-sm active:scale-[0.96] transition-all",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        isActive 
          ? "bg-primary/10 ring-2 ring-primary/30" 
          : "bg-muted/40"
      )}
    >
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full",
        isActive ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
      )}>
        {icon}
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );
}

interface ContactModeButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}

function ContactModeButton({ icon, label, description, onClick }: ContactModeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg bg-card p-3",
        "active:scale-[0.98] transition-transform",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        "border border-border/50"
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div className="text-left">
        <span className="text-sm font-medium text-foreground block">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
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
