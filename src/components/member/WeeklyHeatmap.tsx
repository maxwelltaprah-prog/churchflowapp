import { motion } from "framer-motion";
import { format, subWeeks, startOfWeek, addDays, isSameDay } from "date-fns";

interface WeeklyHeatmapProps {
  attendanceDates: string[];
  weeks?: number;
}

export function WeeklyHeatmap({ attendanceDates, weeks = 12 }: WeeklyHeatmapProps) {
  const today = new Date();
  const startDate = startOfWeek(subWeeks(today, weeks - 1));
  
  // Create a grid of weeks
  const grid: { date: Date; attended: boolean }[][] = [];
  
  for (let w = 0; w < weeks; w++) {
    const week: { date: Date; attended: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(startDate, w * 7 + d);
      const attended = attendanceDates.some(ad => isSameDay(new Date(ad), date));
      week.push({ date, attended });
    }
    grid.push(week);
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <div className="w-4" />
        {grid.map((_, weekIndex) => (
          <div key={weekIndex} className="w-4 text-center">
            {weekIndex === 0 || weekIndex === Math.floor(weeks / 2) || weekIndex === weeks - 1 ? (
              <span className="text-[9px] text-muted-foreground">
                {format(addDays(startDate, weekIndex * 7), 'MMM').slice(0, 1)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {dayLabels.map((day, dayIndex) => (
        <div key={dayIndex} className="flex gap-1 items-center">
          <span className="w-4 text-[9px] text-muted-foreground text-center">{day}</span>
          {grid.map((week, weekIndex) => {
            const cell = week[dayIndex];
            const isFuture = cell.date > today;
            const isToday = isSameDay(cell.date, today);
            
            return (
              <motion.div
                key={`${weekIndex}-${dayIndex}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: (weekIndex + dayIndex) * 0.01 }}
                className={`
                  w-4 h-4 rounded-sm transition-all
                  ${isFuture 
                    ? 'bg-muted/20' 
                    : cell.attended 
                      ? 'bg-gradient-to-br from-primary to-orange-500 shadow-[0_0_6px_rgba(251,146,60,0.4)]' 
                      : 'bg-muted/40 hover:bg-muted/60'
                  }
                  ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                `}
                title={format(cell.date, 'MMM d, yyyy')}
              />
            );
          })}
        </div>
      ))}
      <div className="flex items-center justify-end gap-2 mt-3 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-muted/40" />
          <div className="w-3 h-3 rounded-sm bg-primary/40" />
          <div className="w-3 h-3 rounded-sm bg-primary/70" />
          <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-primary to-orange-500" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
