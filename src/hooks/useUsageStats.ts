import { useMemo } from 'react';
import type { ShortcutData } from '@/types/shortcut';
import { usageHistoryManager } from '@/lib/usageHistoryManager';

const STORAGE_KEY = 'quicklaunch_shortcuts';

export interface UsageStats {
  totalShortcuts: number;
  totalTaps: number;
  thisMonthTaps: number;
  mostUsedShortcuts: ShortcutData[];
  weeklyActivity: { day: string; taps: number }[];
  averageTapsPerDay: number;
}

export function useUsageStats(): UsageStats {
  return useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const shortcuts: ShortcutData[] = stored ? JSON.parse(stored) : [];
      
      // Total shortcuts
      const totalShortcuts = shortcuts.length;
      
      // Total taps (sum of all usageCount)
      const totalTaps = shortcuts.reduce((sum, s) => sum + (s.usageCount || 0), 0);
      
      // Most used shortcuts (top 5)
      const mostUsedShortcuts = [...shortcuts]
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 5)
        .filter(s => (s.usageCount || 0) > 0);
      
      // Get this month's taps from real history
      const thisMonthTaps = usageHistoryManager.getThisMonthTaps();
      
      // Get real weekly activity from history
      const dailyTaps = usageHistoryManager.getDailyTaps(7);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Convert to chart format (oldest to newest)
      const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i)); // Start from 6 days ago
        const key = date.toISOString().split('T')[0];
        return {
          day: days[date.getDay()],
          taps: dailyTaps.get(key) || 0
        };
      });
      
      // Average taps per day (based on last 7 days of real data)
      const weeklyTotal = weeklyActivity.reduce((sum, d) => sum + d.taps, 0);
      const averageTapsPerDay = Math.round((weeklyTotal / 7) * 10) / 10;
      
      return {
        totalShortcuts,
        totalTaps,
        thisMonthTaps,
        mostUsedShortcuts,
        weeklyActivity,
        averageTapsPerDay
      };
    } catch (error) {
      console.error('[useUsageStats] Failed to calculate stats:', error);
      return {
        totalShortcuts: 0,
        totalTaps: 0,
        thisMonthTaps: 0,
        mostUsedShortcuts: [],
        weeklyActivity: [],
        averageTapsPerDay: 0
      };
    }
  }, []);
}
