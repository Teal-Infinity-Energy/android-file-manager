import * as React from "react";
import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { triggerHaptic } from "@/lib/haptics";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  enableSwipe?: boolean;
};

function Calendar({ 
  className, 
  classNames, 
  showOutsideDays = true, 
  enableSwipe = true,
  month: controlledMonth,
  onMonthChange,
  ...props 
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = useState(controlledMonth || new Date());
  const [direction, setDirection] = useState(0);
  
  // Swipe gesture handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const currentMonth = controlledMonth || internalMonth;

  const handleMonthChange = useCallback((newMonth: Date) => {
    if (onMonthChange) {
      onMonthChange(newMonth);
    } else {
      setInternalMonth(newMonth);
    }
  }, [onMonthChange]);

  const navigateMonth = useCallback((delta: number) => {
    triggerHaptic('light');
    setDirection(delta);
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    handleMonthChange(newMonth);
  }, [currentMonth, handleMonthChange]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enableSwipe) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enableSwipe) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!enableSwipe || !touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      navigateMonth(1);
    } else if (isRightSwipe) {
      navigateMonth(-1);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -40 : 40,
      opacity: 0,
    }),
  };

  return (
    <div 
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentMonth.toISOString().slice(0, 7)}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.2 }}
        >
          <DayPicker
            showOutsideDays={showOutsideDays}
            month={currentMonth}
            onMonthChange={handleMonthChange}
            className={cn("p-4 pointer-events-auto", className)}
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center mb-2",
              caption_label: "text-base font-bold tracking-wide",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 w-9 bg-background/80 hover:bg-background p-0 rounded-xl border border-border/40",
                "shadow-sm hover:shadow-md hover:border-primary/30 transition-all",
              ),
              nav_button_previous: "absolute start-0",
              nav_button_next: "absolute end-0",
              table: "w-full border-collapse",
              head_row: "flex mb-2",
              head_cell: "text-muted-foreground rounded-lg w-10 font-semibold text-[0.75rem] uppercase tracking-wider",
              row: "flex w-full mt-1",
              cell: cn(
                "h-10 w-10 text-center text-sm p-0.5 relative",
                "[&:has([aria-selected].day-range-end)]:rounded-r-xl",
                "[&:has([aria-selected].day-outside)]:bg-primary/10",
                "[&:has([aria-selected])]:bg-primary/10",
                "first:[&:has([aria-selected])]:rounded-l-xl",
                "last:[&:has([aria-selected])]:rounded-r-xl",
                "focus-within:relative focus-within:z-20",
              ),
              day: cn(
                "h-9 w-9 p-0 font-medium rounded-xl transition-all",
                "hover:bg-muted hover:scale-105",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1",
                "aria-selected:opacity-100",
              ),
              day_range_end: "day-range-end",
              day_selected: cn(
                "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
                "shadow-lg shadow-primary/30 scale-105",
                "hover:from-primary hover:to-primary/80 hover:text-primary-foreground",
                "focus:from-primary focus:to-primary/80 focus:text-primary-foreground",
              ),
              day_today: cn(
                "bg-primary/10 text-primary font-bold",
                "ring-2 ring-primary/30",
              ),
              day_outside: "day-outside text-muted-foreground/40 opacity-50 aria-selected:bg-primary/5 aria-selected:text-muted-foreground aria-selected:opacity-30",
              day_disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed hover:bg-transparent hover:scale-100",
              day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-primary",
              day_hidden: "invisible",
              ...classNames,
            }}
            components={{
              IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4 rtl:rotate-180" />,
              IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4 rtl:rotate-180" />,
            }}
            {...props}
          />
        </motion.div>
      </AnimatePresence>
      
      {/* Swipe hint - subtle gradient at edges */}
      {enableSwipe && (
        <>
          <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background/80 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background/80 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
        </>
      )}
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
