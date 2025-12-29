import { useMemo } from "react";
import { HeatmapData } from "@/hooks/useCheckinHeatmapData";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, Flame, TrendingUp } from "lucide-react";

interface HeatmapChartProps {
  data: HeatmapData;
  isLoading?: boolean;
  isSingleService?: boolean;
}

const CELL_MIN_SIZE = 28;
const CELL_GAP = 2;

// Modern color scale - from cool to warm
const getHeatColor = (value: number, max: number): string => {
  if (max === 0 || value === 0) return "bg-muted/30";
  
  const intensity = value / max;
  
  if (intensity <= 0.2) return "bg-primary/20";
  if (intensity <= 0.4) return "bg-primary/40";
  if (intensity <= 0.6) return "bg-primary/60";
  if (intensity <= 0.8) return "bg-primary/80";
  return "bg-primary";
};

const getTextColor = (value: number, max: number): string => {
  if (max === 0 || value === 0) return "text-muted-foreground/50";
  
  const intensity = value / max;
  if (intensity > 0.5) return "text-primary-foreground";
  return "text-foreground";
};

export function HeatmapChart({ data, isLoading, isSingleService }: HeatmapChartProps) {
  const { cells, hours, rows, maxCount, peakHour, peakCount, totalCheckins } = data;

  const formattedHours = useMemo(() => {
    return hours.map(h => {
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? "AM" : "PM";
      return `${hour12}${ampm}`;
    });
  }, [hours]);

  const cellsByPosition = useMemo(() => {
    const map = new Map<string, typeof cells[0]>();
    cells.forEach(cell => {
      map.set(`${cell.hour}-${cell.rowIndex}`, cell);
    });
    return map;
  }, [cells]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data.hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Clock className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm font-medium">No check-ins recorded for this selection</p>
        <p className="text-xs mt-1">Try selecting a different service or date range</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-4">
        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium">{totalCheckins}</span>
            <span>total check-ins</span>
          </div>
          {peakHour !== null && (
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-medium text-orange-600 dark:text-orange-400">
                Peak: {peakHour % 12 || 12}:00 {peakHour < 12 ? "AM" : "PM"}
              </span>
              <span className="text-muted-foreground">
                ({peakCount} check-in{peakCount !== 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>

        {/* Heatmap grid */}
        <div className="overflow-x-auto pb-2">
          <div className="inline-block min-w-full">
            {/* Header row - hours */}
            <div className="flex mb-1">
              <div className="flex-shrink-0" style={{ width: isSingleService ? 60 : 200 }} />
              {formattedHours.map((hour, i) => (
                <div
                  key={i}
                  className="text-center text-xs font-medium text-muted-foreground px-0.5"
                  style={{ width: CELL_MIN_SIZE, minWidth: CELL_MIN_SIZE }}
                >
                  {hour}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center" style={{ marginBottom: CELL_GAP }}>
                {/* Row label */}
                <div
                  className="flex-shrink-0 text-xs text-muted-foreground truncate pr-2 text-right"
                  style={{ width: isSingleService ? 60 : 200 }}
                  title={row}
                >
                  {row}
                </div>
                
                {/* Cells for each hour */}
                {hours.map((hour, hourIndex) => {
                  const cell = cellsByPosition.get(`${hour}-${rowIndex}`);
                  const count = cell?.count || 0;
                  
                  return (
                    <Tooltip key={hourIndex}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "rounded-sm transition-all duration-150 hover:ring-2 hover:ring-primary/50 hover:scale-110 cursor-default flex items-center justify-center",
                            getHeatColor(count, maxCount),
                            getTextColor(count, maxCount)
                          )}
                          style={{
                            width: CELL_MIN_SIZE - CELL_GAP,
                            height: CELL_MIN_SIZE - CELL_GAP,
                            marginRight: CELL_GAP,
                            fontSize: 10,
                          }}
                        >
                          {count > 0 && count}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="bg-popover border-border shadow-lg"
                      >
                        <div className="text-xs space-y-1">
                          {cell?.serviceName && (
                            <div className="font-semibold">{cell.serviceName}</div>
                          )}
                          {cell?.serviceDate && (
                            <div className="text-muted-foreground">{cell.serviceDate}</div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {hour % 12 || 12}:00 {hour < 12 ? "AM" : "PM"}
                            </span>
                            {isSingleService && (
                              <span className="text-muted-foreground">{row}</span>
                            )}
                          </div>
                          <div className="text-primary font-semibold">
                            {count} check-in{count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground pt-2 border-t">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 rounded-sm bg-muted/30" />
            <div className="w-4 h-4 rounded-sm bg-primary/20" />
            <div className="w-4 h-4 rounded-sm bg-primary/40" />
            <div className="w-4 h-4 rounded-sm bg-primary/60" />
            <div className="w-4 h-4 rounded-sm bg-primary/80" />
            <div className="w-4 h-4 rounded-sm bg-primary" />
          </div>
          <span>More</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
