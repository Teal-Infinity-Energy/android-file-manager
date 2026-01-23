// Scheduled Actions Manager
// Handles CRUD operations and storage for scheduled actions

import type { 
  ScheduledAction, 
  CreateScheduledActionInput,
  RecurrenceType,
  RecurrenceAnchor
} from '@/types/scheduledAction';

const STORAGE_KEY = 'scheduled_actions';

// Event for reactivity
const CHANGE_EVENT = 'scheduled-actions-changed';

function notifyChange(): void {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function onScheduledActionsChange(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

// Generate unique ID
function generateId(): string {
  return `sa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get all scheduled actions
export function getScheduledActions(): ScheduledAction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ScheduledAction[];
  } catch (error) {
    console.error('Failed to load scheduled actions:', error);
    return [];
  }
}

// Save all scheduled actions
function saveScheduledActions(actions: ScheduledAction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
    notifyChange();
  } catch (error) {
    console.error('Failed to save scheduled actions:', error);
  }
}

// Get a single scheduled action by ID
export function getScheduledAction(id: string): ScheduledAction | null {
  const actions = getScheduledActions();
  return actions.find(a => a.id === id) || null;
}

// Create a new scheduled action
export function createScheduledAction(input: CreateScheduledActionInput): ScheduledAction {
  const action: ScheduledAction = {
    id: generateId(),
    name: input.name,
    destination: input.destination,
    triggerTime: input.triggerTime,
    recurrence: input.recurrence,
    enabled: true,
    createdAt: Date.now(),
    recurrenceAnchor: input.recurrenceAnchor,
  };

  const actions = getScheduledActions();
  actions.push(action);
  saveScheduledActions(actions);

  return action;
}

// Update an existing scheduled action
export function updateScheduledAction(
  id: string, 
  updates: Partial<Omit<ScheduledAction, 'id' | 'createdAt'>>
): ScheduledAction | null {
  const actions = getScheduledActions();
  const index = actions.findIndex(a => a.id === id);
  
  if (index === -1) return null;

  actions[index] = { ...actions[index], ...updates };
  saveScheduledActions(actions);

  return actions[index];
}

// Delete a scheduled action
export function deleteScheduledAction(id: string): boolean {
  const actions = getScheduledActions();
  const filtered = actions.filter(a => a.id !== id);
  
  if (filtered.length === actions.length) return false;

  saveScheduledActions(filtered);
  return true;
}

// Toggle enabled state
export function toggleScheduledAction(id: string): ScheduledAction | null {
  const action = getScheduledAction(id);
  if (!action) return null;

  return updateScheduledAction(id, { enabled: !action.enabled });
}

// Get active (enabled) scheduled actions sorted by trigger time
export function getActiveScheduledActions(): ScheduledAction[] {
  return getScheduledActions()
    .filter(a => a.enabled)
    .sort((a, b) => a.triggerTime - b.triggerTime);
}

// Get count of enabled actions
export function getActiveCount(): number {
  return getScheduledActions().filter(a => a.enabled).length;
}

// Compute next trigger time for recurring actions
export function computeNextTrigger(
  recurrence: RecurrenceType,
  anchor: RecurrenceAnchor,
  afterTime: number = Date.now()
): number {
  const now = new Date(afterTime);
  const result = new Date(now);

  // Set the time of day
  result.setHours(anchor.hour, anchor.minute, 0, 0);

  switch (recurrence) {
    case 'once':
      // For one-time, just return the anchor time if it's in the future
      if (result.getTime() <= afterTime) {
        result.setDate(result.getDate() + 1);
      }
      break;

    case 'daily':
      // If the time has passed today, schedule for tomorrow
      if (result.getTime() <= afterTime) {
        result.setDate(result.getDate() + 1);
      }
      break;

    case 'weekly':
      if (anchor.dayOfWeek !== undefined) {
        const currentDay = result.getDay();
        let daysUntil = anchor.dayOfWeek - currentDay;
        
        if (daysUntil < 0 || (daysUntil === 0 && result.getTime() <= afterTime)) {
          daysUntil += 7;
        }
        
        result.setDate(result.getDate() + daysUntil);
      }
      break;

    case 'yearly':
      if (anchor.month !== undefined && anchor.dayOfMonth !== undefined) {
        result.setMonth(anchor.month, anchor.dayOfMonth);
        
        // If this date has passed this year, schedule for next year
        if (result.getTime() <= afterTime) {
          result.setFullYear(result.getFullYear() + 1);
        }
      }
      break;
  }

  return result.getTime();
}

// Advance a recurring action to its next trigger time
export function advanceToNextTrigger(id: string): ScheduledAction | null {
  const action = getScheduledAction(id);
  if (!action || action.recurrence === 'once' || !action.recurrenceAnchor) {
    return null;
  }

  const nextTrigger = computeNextTrigger(
    action.recurrence,
    action.recurrenceAnchor,
    action.triggerTime + 1000 // Add 1 second to ensure we get the *next* occurrence
  );

  return updateScheduledAction(id, { triggerTime: nextTrigger });
}

// Format trigger time for display
export function formatTriggerTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const timeStr = date.toLocaleTimeString(undefined, { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  // Check if it's today
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${timeStr}`;
  }

  // Check if it's tomorrow
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${timeStr}`;
  }

  // Check if it's within this week
  const daysUntil = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 7) {
    const dayName = date.toLocaleDateString(undefined, { weekday: 'long' });
    return `${dayName} at ${timeStr}`;
  }

  // Otherwise show full date
  const dateStr = date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric' 
  });
  return `${dateStr} at ${timeStr}`;
}

// Format recurrence for display
export function formatRecurrence(recurrence: RecurrenceType): string {
  switch (recurrence) {
    case 'once': return 'One time';
    case 'daily': return 'Every day';
    case 'weekly': return 'Every week';
    case 'yearly': return 'Every year';
  }
}
