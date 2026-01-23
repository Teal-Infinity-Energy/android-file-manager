// Scheduled Action Creator - multi-step flow for creating a scheduled action
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, FileText, Link, Phone, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScheduledTimingPicker } from './ScheduledTimingPicker';
import { useScheduledActions } from '@/hooks/useScheduledActions';
import { triggerHaptic } from '@/lib/haptics';
import type { 
  ScheduledActionDestination, 
  RecurrenceType, 
  RecurrenceAnchor,
  CreateScheduledActionInput 
} from '@/types/scheduledAction';

type CreatorStep = 'destination' | 'timing' | 'confirm';

interface ScheduledActionCreatorProps {
  onComplete: () => void;
  onBack: () => void;
  // Optional: pre-selected destination (when creating from existing shortcut flow)
  initialDestination?: ScheduledActionDestination;
}

export function ScheduledActionCreator({ 
  onComplete, 
  onBack,
  initialDestination 
}: ScheduledActionCreatorProps) {
  const { createScheduledAction, requestPermissions } = useScheduledActions();
  
  const [step, setStep] = useState<CreatorStep>(initialDestination ? 'timing' : 'destination');
  const [destination, setDestination] = useState<ScheduledActionDestination | null>(
    initialDestination || null
  );
  const [timing, setTiming] = useState<{
    triggerTime: number;
    recurrence: RecurrenceType;
    anchor: RecurrenceAnchor;
  } | null>(null);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Get suggested name based on destination
  const getSuggestedName = useCallback((dest: ScheduledActionDestination): string => {
    switch (dest.type) {
      case 'file':
        return dest.name.replace(/\.[^/.]+$/, ''); // Remove extension
      case 'url':
        return dest.name || 'Open link';
      case 'contact':
        return `Call ${dest.contactName}`;
    }
  }, []);

  const handleDestinationSelect = (dest: ScheduledActionDestination) => {
    setDestination(dest);
    setName(getSuggestedName(dest));
    setStep('timing');
  };

  const handleTimingConfirm = (
    triggerTime: number, 
    recurrence: RecurrenceType, 
    anchor: RecurrenceAnchor
  ) => {
    setTiming({ triggerTime, recurrence, anchor });
    setStep('confirm');
  };

  const handleCreate = async () => {
    if (!destination || !timing) return;

    setIsCreating(true);
    triggerHaptic('medium');

    try {
      // Request permissions if needed
      const permissions = await requestPermissions();
      if (!permissions.notifications) {
        console.warn('Notification permission not granted');
        // Continue anyway - user can still use the feature
      }

      const input: CreateScheduledActionInput = {
        name: name.trim() || getSuggestedName(destination),
        destination,
        triggerTime: timing.triggerTime,
        recurrence: timing.recurrence,
        recurrenceAnchor: timing.anchor,
      };

      const action = await createScheduledAction(input);
      
      if (action) {
        triggerHaptic('success');
        onComplete();
      } else {
        triggerHaptic('warning');
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error creating scheduled action:', error);
      triggerHaptic('warning');
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'destination':
        onBack();
        break;
      case 'timing':
        if (initialDestination) {
          onBack();
        } else {
          setStep('destination');
        }
        break;
      case 'confirm':
        setStep('timing');
        break;
    }
  };

  const getDestinationIcon = (type: 'file' | 'url' | 'contact') => {
    switch (type) {
      case 'file': return <FileText className="h-5 w-5" />;
      case 'url': return <Link className="h-5 w-5" />;
      case 'contact': return <Phone className="h-5 w-5" />;
    }
  };

  // Step: Select destination type (placeholder - will integrate with existing pickers)
  if (step === 'destination') {
    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-transform"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">What to open</h2>
        </div>

        <div className="flex-1 px-5 py-6">
          <p className="text-sm text-muted-foreground mb-6">
            Select what should open when this action triggers.
          </p>

          <div className="space-y-3">
            {/* Placeholder buttons - in real implementation, these open the respective pickers */}
            <DestinationOption
              icon={<FileText className="h-5 w-5" />}
              label="Local File"
              description="Photo, video, PDF, or document"
              onClick={() => {
                // TODO: Open file picker
                // For now, create a test destination
                handleDestinationSelect({
                  type: 'file',
                  uri: 'content://test',
                  name: 'Test File.pdf',
                  mimeType: 'application/pdf',
                });
              }}
            />
            <DestinationOption
              icon={<Link className="h-5 w-5" />}
              label="Link"
              description="Website or saved bookmark"
              onClick={() => {
                // TODO: Open URL input or bookmark picker
                handleDestinationSelect({
                  type: 'url',
                  uri: 'https://example.com',
                  name: 'Example Website',
                });
              }}
            />
            <DestinationOption
              icon={<Phone className="h-5 w-5" />}
              label="Contact"
              description="Call someone at a scheduled time"
              onClick={() => {
                // TODO: Open contact picker
                handleDestinationSelect({
                  type: 'contact',
                  phoneNumber: '+1234567890',
                  contactName: 'Test Contact',
                });
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Step: Select timing
  if (step === 'timing') {
    return (
      <ScheduledTimingPicker
        onConfirm={handleTimingConfirm}
        onBack={handleBack}
        suggestedRecurrence={
          destination?.type === 'contact' ? 'yearly' : 'once'
        }
      />
    );
  }

  // Step: Confirm and name
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-transform"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">Name this action</h2>
      </div>

      <div className="flex-1 px-5 py-6 space-y-6">
        {/* Name input */}
        <div>
          <Label htmlFor="action-name" className="text-sm font-medium mb-2 block">
            Action name
          </Label>
          <Input
            id="action-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={destination ? getSuggestedName(destination) : 'My action'}
            className="h-12 rounded-xl text-base"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-2">
            This will appear in the notification when triggered.
          </p>
        </div>

        {/* Preview card */}
        {destination && timing && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                {getDestinationIcon(destination.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">
                  {name || getSuggestedName(destination)}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {destination.type === 'file' && destination.name}
                  {destination.type === 'url' && destination.uri}
                  {destination.type === 'contact' && destination.contactName}
                </p>
                <p className="text-xs text-primary mt-1.5">
                  {new Date(timing.triggerTime).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                  {timing.recurrence !== 'once' && ` · Repeats ${timing.recurrence}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create button */}
      <div className="p-5 border-t border-border">
        <Button 
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full h-12 rounded-2xl text-base gap-2"
        >
          {isCreating ? (
            'Scheduling...'
          ) : (
            <>
              <Check className="h-5 w-5" />
              Schedule Action
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Destination option button
function DestinationOption({ 
  icon, 
  label, 
  description, 
  onClick 
}: { 
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 rounded-2xl bg-card border border-border p-4",
        "active:scale-[0.98] transition-all",
        "focus:outline-none focus:ring-2 focus:ring-ring"
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div className="text-left">
        <h3 className="font-medium text-sm">{label}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}
