import { motion } from "framer-motion";
import { format, subWeeks, startOfWeek, addDays, isSameDay, getMonth } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WeeklyHeatmapProps {
  attendanceDates: string[];
  weeks?: number;
}

export function WeeklyHeatmap({ attendanceDates, weeks = 16 }: WeeklyHeatmapProps) {
  const today = new Date();
  const startDate = startOfWeek(subWeeks(today, weeks - 1));
  
  // Create a grid of weeks (columns) x days (rows)
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

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get month labels for header
  const monthLabels: { label: string; colSpan: number; startCol: number }[] = [];
  let currentMonth = -1;
  let currentStartCol = 0;
  let currentColSpan = 0;

  grid.forEach((week, weekIndex) => {
    const month = getMonth(week[0].date);
    if (month !== currentMonth) {
      if (currentMonth !== -1) {
        monthLabels.push({
          label: format(grid[currentStartCol][0].date, 'MMM'),
          colSpan: currentColSpan,
          startCol: currentStartCol
        });
      }
      currentMonth = month;
      currentStartCol = weekIndex;
      currentColSpan = 1;
    } else {
      currentColSpan++;
    }
  });
  // Push the last month
  monthLabels.push({
    label: format(grid[currentStartCol][0].date, 'MMM'),
    colSpan: currentColSpan,
    startCol: currentStartCol
  });

  const totalAttended = attendanceDates.length;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Stats summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {totalAttended} services in the last {weeks} weeks
          </span>
        </div>

        {/* Heatmap grid */}
        <div className="overflow-x-auto pb-2">
          <div className="inline-block min-w-full">
            {/* Month headers */}
            <div className="flex mb-2 ml-12">
              {monthLabels.map((month, idx) => (
                <div 
                  key={idx} 
                  className="text-xs text-muted-foreground font-medium"
                  style={{ width: `${month.colSpan * 20}px` }}
                >
                  {month.label}
                </div>
              ))}
            </div>

            {/* Day rows */}
            <div className="space-y-1">
              {dayLabels.map((day, dayIndex) => (
                <div key={dayIndex} className="flex items-center gap-2">
                  <span className="w-10 text-xs text-muted-foreground text-right pr-1">
                    {dayIndex % 2 === 0 ? day : ''}
                  </span>
                  <div className="flex gap-1">
                    {grid.map((week, weekIndex) => {
                      const cell = week[dayIndex];
                      const isFuture = cell.date > today;
                      const isToday = isSameDay(cell.date, today);
                      
                      return (
                        <Tooltip key={`${weekIndex}-${dayIndex}`}>
                          <TooltipTrigger asChild>
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: (weekIndex * 7 + dayIndex) * 0.003 }}
                              className={`
                                w-4 h-4 rounded-[3px] cursor-pointer transition-all hover:scale-125
                                ${isFuture 
                                  ? 'bg-muted/10 cursor-default' 
                                  : cell.attended 
                                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(52,211,153,0.5)]' 
                                    : 'bg-muted/30 hover:bg-muted/50'
                                }
                                ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                              `}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">{format(cell.date, 'EEEE, MMM d, yyyy')}</p>
                            <p className={cell.attended ? 'text-emerald-400' : 'text-muted-foreground'}>
                              {isFuture ? 'Upcoming' : cell.attended ? '✓ Attended' : 'No attendance'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">Activity level</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-[2px] bg-muted/30" />
              <div className="w-3 h-3 rounded-[2px] bg-emerald-400/30" />
              <div className="w-3 h-3 rounded-[2px] bg-emerald-400/60" />
              <div className="w-3 h-3 rounded-[2px] bg-gradient-to-br from-emerald-400 to-emerald-600" />
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}