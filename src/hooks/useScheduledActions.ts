// React hook for managing scheduled actions
import { useState, useEffect, useCallback } from 'react';
import type { 
  ScheduledAction, 
  CreateScheduledActionInput,
  ScheduledActionDestination 
} from '@/types/scheduledAction';
import {
  getScheduledActions,
  createScheduledAction as createAction,
  updateScheduledAction,
  deleteScheduledAction as deleteAction,
  toggleScheduledAction,
  getActiveCount,
  onScheduledActionsChange,
} from '@/lib/scheduledActionsManager';
import ShortcutPlugin from '@/plugins/ShortcutPlugin';

interface UseScheduledActionsReturn {
  actions: ScheduledAction[];
  activeCount: number;
  isLoading: boolean;
  
  // CRUD operations
  createScheduledAction: (input: CreateScheduledActionInput) => Promise<ScheduledAction | null>;
  updateAction: (id: string, updates: Partial<ScheduledAction>) => Promise<boolean>;
  deleteScheduledAction: (id: string) => Promise<boolean>;
  toggleAction: (id: string) => Promise<boolean>;
  
  // Permission checks
  checkPermissions: () => Promise<{ notifications: boolean; alarms: boolean }>;
  requestPermissions: () => Promise<{ notifications: boolean; alarms: boolean }>;
}

export function useScheduledActions(): UseScheduledActionsReturn {
  const [actions, setActions] = useState<ScheduledAction[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load actions on mount and subscribe to changes
  useEffect(() => {
    const loadActions = () => {
      setActions(getScheduledActions());
      setActiveCount(getActiveCount());
      setIsLoading(false);
    };

    loadActions();
    
    const unsubscribe = onScheduledActionsChange(loadActions);
    return unsubscribe;
  }, []);

  // Create a new scheduled action
  const createScheduledAction = useCallback(async (
    input: CreateScheduledActionInput
  ): Promise<ScheduledAction | null> => {
    try {
      // Create in local storage first
      const action = createAction(input);

      // Schedule with native plugin
      const destinationData = JSON.stringify(input.destination);
      const result = await ShortcutPlugin.scheduleAction({
        id: action.id,
        name: action.name,
        destinationType: input.destination.type,
        destinationData,
        triggerTime: input.triggerTime,
        recurrence: input.recurrence,
      });

      if (!result.success) {
        console.error('Failed to schedule action natively:', result.error);
        // Still return the action - it's saved locally
        // Native scheduling failure shouldn't block the feature
      }

      return action;
    } catch (error) {
      console.error('Error creating scheduled action:', error);
      return null;
    }
  }, []);

  // Update an existing action
  const updateAction = useCallback(async (
    id: string, 
    updates: Partial<ScheduledAction>
  ): Promise<boolean> => {
    try {
      const updated = updateScheduledAction(id, updates);
      if (!updated) return false;

      // If trigger time or enabled state changed, update native alarm
      if ('triggerTime' in updates || 'enabled' in updates) {
        if (updated.enabled) {
          const destinationData = JSON.stringify(updated.destination);
          await ShortcutPlugin.scheduleAction({
            id: updated.id,
            name: updated.name,
            destinationType: updated.destination.type,
            destinationData,
            triggerTime: updated.triggerTime,
            recurrence: updated.recurrence,
          });
        } else {
          await ShortcutPlugin.cancelScheduledAction({ id });
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating scheduled action:', error);
      return false;
    }
  }, []);

  // Delete an action
  const deleteScheduledAction = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Cancel native alarm first
      await ShortcutPlugin.cancelScheduledAction({ id });
      
      // Then delete from storage
      return deleteAction(id);
    } catch (error) {
      console.error('Error deleting scheduled action:', error);
      return false;
    }
  }, []);

  // Toggle enabled state
  const toggleAction = useCallback(async (id: string): Promise<boolean> => {
    try {
      const action = toggleScheduledAction(id);
      if (!action) return false;

      if (action.enabled) {
        // Re-schedule the alarm
        const destinationData = JSON.stringify(action.destination);
        await ShortcutPlugin.scheduleAction({
          id: action.id,
          name: action.name,
          destinationType: action.destination.type,
          destinationData,
          triggerTime: action.triggerTime,
          recurrence: action.recurrence,
        });
      } else {
        // Cancel the alarm
        await ShortcutPlugin.cancelScheduledAction({ id });
      }

      return true;
    } catch (error) {
      console.error('Error toggling scheduled action:', error);
      return false;
    }
  }, []);

  // Check current permission status
  const checkPermissions = useCallback(async (): Promise<{ 
    notifications: boolean; 
    alarms: boolean 
  }> => {
    try {
      const [notifResult, alarmResult] = await Promise.all([
        ShortcutPlugin.checkNotificationPermission(),
        ShortcutPlugin.checkAlarmPermission(),
      ]);

      return {
        notifications: notifResult.granted,
        alarms: alarmResult.granted,
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return { notifications: false, alarms: false };
    }
  }, []);

  // Request required permissions
  const requestPermissions = useCallback(async (): Promise<{ 
    notifications: boolean; 
    alarms: boolean 
  }> => {
    try {
      // Request notification permission first
      const notifResult = await ShortcutPlugin.requestNotificationPermission();
      
      // Check alarm permission (may need to direct to settings on Android 12+)
      const alarmResult = await ShortcutPlugin.checkAlarmPermission();

      return {
        notifications: notifResult.granted,
        alarms: alarmResult.granted,
      };
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return { notifications: false, alarms: false };
    }
  }, []);

  return {
    actions,
    activeCount,
    isLoading,
    createScheduledAction,
    updateAction,
    deleteScheduledAction,
    toggleAction,
    checkPermissions,
    requestPermissions,
  };
}
