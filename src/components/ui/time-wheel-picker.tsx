// iOS-style scrollable wheel picker for time selection
import { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { triggerSelectionFeedback } from '@/lib/haptics';

interface WheelPickerProps {
  values: (string | number)[];
  selectedValue: string | number;
  onChange: (value: string | number) => void;
  className?: string;
  itemHeight?: number;
  visibleItems?: number;
}

export function WheelPicker({
  values,
  selectedValue,
  onChange,
  className,
  itemHeight = 36,
  visibleItems = 3,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const lastSelectedIndex = useRef<number>(-1);
  
  const selectedIndex = values.indexOf(selectedValue);
  const containerHeight = itemHeight * visibleItems;
  const paddingItems = Math.floor(visibleItems / 2);

  // Scroll to selected value on mount and when selectedValue changes externally
  useEffect(() => {
    if (containerRef.current && !isScrolling) {
      const targetScroll = selectedIndex * itemHeight;
      containerRef.current.scrollTop = targetScroll;
      lastSelectedIndex.current = selectedIndex;
    }
  }, [selectedIndex, itemHeight, isScrolling]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    // Debounce the scroll end detection
    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(newIndex, values.length - 1));
      
      // Snap to the nearest item
      containerRef.current.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: 'smooth',
      });
      
      // Trigger haptic and call onChange if value changed
      if (clampedIndex !== lastSelectedIndex.current) {
        lastSelectedIndex.current = clampedIndex;
        triggerSelectionFeedback();
        onChange(values[clampedIndex]);
      }
      
      setIsScrolling(false);
    }, 80);
  }, [itemHeight, values, onChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  return (
    <div 
      className={cn(
        "relative overflow-hidden select-none",
        className
      )}
      style={{ height: containerHeight }}
    >
      {/* Selection highlight bar */}
      <div 
        className="absolute left-0 right-0 pointer-events-none z-10 bg-primary/10 border-y border-primary/20"
        style={{ 
          top: paddingItems * itemHeight,
          height: itemHeight,
        }}
      />
      
      {/* Gradient fades */}
      <div 
        className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background to-transparent pointer-events-none z-20"
      />
      <div 
        className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none z-20"
      />
      
      {/* Scrollable area */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide scroll-smooth"
        onScroll={handleScroll}
        style={{ 
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Top padding */}
        <div style={{ height: paddingItems * itemHeight }} />
        
        {/* Items */}
        {values.map((value, index) => {
          const isSelected = index === selectedIndex;
          const distance = Math.abs(index - selectedIndex);
          const opacity = isSelected ? 1 : Math.max(0.3, 1 - distance * 0.25);
          const scale = isSelected ? 1 : Math.max(0.85, 1 - distance * 0.05);
          
          return (
            <div
              key={value}
              className={cn(
                "flex items-center justify-center transition-all duration-150",
                isSelected ? "text-foreground font-semibold" : "text-muted-foreground"
              )}
              style={{ 
                height: itemHeight,
                scrollSnapAlign: 'center',
                opacity,
                transform: `scale(${scale})`,
              }}
              onClick={() => {
                if (containerRef.current) {
                  containerRef.current.scrollTo({
                    top: index * itemHeight,
                    behavior: 'smooth',
                  });
                }
              }}
            >
              <span className="text-lg tabular-nums">
                {typeof value === 'number' ? value.toString().padStart(2, '0') : value}
              </span>
            </div>
          );
        })}
        
        {/* Bottom padding */}
        <div style={{ height: paddingItems * itemHeight }} />
      </div>
    </div>
  );
}

// Convenience component for time picking
interface TimeWheelPickerProps {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  onPeriodChange: (period: 'AM' | 'PM') => void;
}

export function TimeWheelPicker({
  hour,
  minute,
  period,
  onHourChange,
  onMinuteChange,
  onPeriodChange,
}: TimeWheelPickerProps) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  return (
    <div className="flex items-center justify-center gap-0.5">
      {/* Hour wheel */}
      <WheelPicker
        values={hours}
        selectedValue={hour}
        onChange={(v) => onHourChange(v as number)}
        className="w-12"
      />
      
      {/* Separator */}
      <span className="text-lg font-semibold text-muted-foreground">:</span>
      
      {/* Minute wheel */}
      <WheelPicker
        values={minutes}
        selectedValue={minute}
        onChange={(v) => onMinuteChange(v as number)}
        className="w-12"
      />
      
      {/* Period wheel */}
      <WheelPicker
        values={periods}
        selectedValue={period}
        onChange={(v) => onPeriodChange(v as 'AM' | 'PM')}
        className="w-12 ml-1"
      />
    </div>
  );
}
