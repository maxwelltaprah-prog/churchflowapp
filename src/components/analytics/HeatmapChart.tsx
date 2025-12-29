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

const CELL_HEIGHT = 36;
const CELL_WIDTH = 48;
const CELL_GAP = 1;

// Viridis-inspired color scale (purple -> teal -> green -> yellow)
const getHeatColor = (value: number, max: number): string => {
  if (max === 0 || value === 0) return "rgb(68, 1, 84)"; // Dark purple for 0
  
  const intensity = value / max;
  
  // Viridis colormap approximation
  if (intensity <= 0.1) return "rgb(68, 1, 84)";
  if (intensity <= 0.2) return "rgb(72, 40, 120)";
  if (intensity <= 0.3) return "rgb(62, 74, 137)";
  if (intensity <= 0.4) return "rgb(49, 104, 142)";
  if (intensity <= 0.5) return "rgb(38, 130, 142)";
  if (intensity <= 0.6) return "rgb(31, 158, 137)";
  if (intensity <= 0.7) return "rgb(53, 183, 121)";
  if (intensity <= 0.8) return "rgb(109, 205, 89)";
  if (intensity <= 0.9) return "rgb(180, 222, 44)";
  return "rgb(253, 231, 37)"; // Bright yellow for max
};

const getTextColor = (value: number, max: number): string => {
  if (max === 0) return "text-white/60";
  const intensity = value / max;
  // Light text for dark backgrounds, dark text for light backgrounds
  if (intensity > 0.65) return "text-gray-900";
  return "text-white";
};

export function HeatmapChart({ data, isLoading, isSingleService }: HeatmapChartProps) {
  const { cells, hours, rows, maxCount, peakHour, peakCount, totalCheckins } = data;

  const formattedHours = useMemo(() => {
    return hours.map(h => `${h}:00`);
  }, [hours]);

  const cellsByPosition = useMemo(() => {
    const map = new Map<string, typeof cells[0]>();
    cells.forEach(cell => {
      map.set(`${cell.hour}-${cell.rowIndex}`, cell);
    });
    return map;
  }, [cells]);

  // Generate legend steps
  const legendSteps = useMemo(() => {
    if (maxCount === 0) return [0];
    const steps = [];
    for (let i = 0; i <= 5; i++) {
      steps.push(Math.round((maxCount * i) / 5));
    }
    return steps.reverse();
  }, [maxCount]);

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

  const labelWidth = isSingleService ? 50 : 180;

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
                Peak: {peakHour}:00
              </span>
              <span className="text-muted-foreground">
                ({peakCount} check-in{peakCount !== 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>

        {/* Heatmap container */}
        <div className="flex gap-4">
          {/* Main heatmap */}
          <div className="overflow-x-auto flex-1">
            <div className="inline-block">
              {/* Y-axis label */}
              <div 
                className="text-xs text-muted-foreground mb-2 pl-1"
                style={{ marginLeft: labelWidth }}
              >
                {isSingleService ? "" : "Service instance (only days with service)"}
              </div>

              {/* Header row - hours */}
              <div className="flex" style={{ marginLeft: labelWidth }}>
                {formattedHours.map((hour, i) => (
                  <div
                    key={i}
                    className="text-center text-xs font-medium text-muted-foreground"
                    style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
                  >
                    {hour}
                  </div>
                ))}
              </div>

              {/* Data rows */}
              <div className="mt-1">
                {rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center" style={{ marginBottom: CELL_GAP }}>
                    {/* Row label */}
                    <div
                      className="flex-shrink-0 text-xs text-muted-foreground truncate pr-2 text-right"
                      style={{ width: labelWidth }}
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
                                "transition-all duration-150 hover:ring-2 hover:ring-white/50 hover:z-10 cursor-default flex items-center justify-center font-medium",
                                getTextColor(count, maxCount)
                              )}
                              style={{
                                width: CELL_WIDTH - CELL_GAP,
                                height: CELL_HEIGHT - CELL_GAP,
                                marginRight: CELL_GAP,
                                backgroundColor: getHeatColor(count, maxCount),
                                fontSize: 11,
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
                                <span className="font-medium">{hour}:00</span>
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

              {/* X-axis label */}
              <div 
                className="text-xs text-muted-foreground text-center mt-3"
                style={{ marginLeft: labelWidth }}
              >
                Hour of day
              </div>
            </div>
          </div>

          {/* Color scale legend */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div 
              className="w-5 rounded-sm overflow-hidden"
              style={{
                height: rows.length * CELL_HEIGHT,
                minHeight: 120,
                background: "linear-gradient(to bottom, rgb(253, 231, 37), rgb(109, 205, 89), rgb(31, 158, 137), rgb(49, 104, 142), rgb(72, 40, 120), rgb(68, 1, 84))"
              }}
            />
            <div className="flex flex-col justify-between text-xs text-muted-foreground" style={{ height: rows.length * CELL_HEIGHT, minHeight: 120 }}>
              {legendSteps.map((step, i) => (
                <span key={i} className="text-right" style={{ width: 30 }}>{step}</span>
              ))}
            </div>
            <span className="text-xs text-muted-foreground mt-1 writing-vertical">Check-ins</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
