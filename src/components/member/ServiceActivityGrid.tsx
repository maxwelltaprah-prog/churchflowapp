import { motion } from "framer-motion";
import { format, getMonth } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, X } from "lucide-react";

interface ChurchService {
  id: string;
  name: string;
  service_date: string;
  branches?: { name: string } | null;
}

interface ServiceActivityGridProps {
  services: ChurchService[];
  attendedServiceIds: Set<string>;
  maxServices?: number;
}

export function ServiceActivityGrid({ 
  services, 
  attendedServiceIds, 
  maxServices = 40 
}: ServiceActivityGridProps) {
  // Sort services from oldest to newest for display
  const sortedServices = [...services]
    .sort((a, b) => new Date(a.service_date).getTime() - new Date(b.service_date).getTime())
    .slice(-maxServices); // Show most recent X services

  const attendedCount = sortedServices.filter(s => attendedServiceIds.has(s.id)).length;
  const attendanceRate = sortedServices.length > 0 
    ? Math.round((attendedCount / sortedServices.length) * 100) 
    : 0;

  // Group services by month for display
  const monthGroups: { month: string; services: typeof sortedServices }[] = [];
  let currentMonth = -1;
  let currentYear = -1;

  sortedServices.forEach((service) => {
    const date = new Date(service.service_date);
    const month = getMonth(date);
    const year = date.getFullYear();

    if (month !== currentMonth || year !== currentYear) {
      monthGroups.push({
        month: format(date, 'MMM yyyy'),
        services: [service]
      });
      currentMonth = month;
      currentYear = year;
    } else {
      monthGroups[monthGroups.length - 1].services.push(service);
    }
  });

  if (sortedServices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No services created yet</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Stats summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {attendedCount} of {sortedServices.length} services attended
          </span>
          <span className="font-medium text-primary">
            {attendanceRate}% attendance
          </span>
        </div>

        {/* Service grid */}
        <div className="overflow-x-auto pb-2">
          <div className="space-y-3 min-w-fit">
            {monthGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-1.5">
                {/* Month label */}
                <div className="text-xs text-muted-foreground font-medium pl-1">
                  {group.month}
                </div>
                
                {/* Services row */}
                <div className="flex gap-1.5 flex-wrap">
                  {group.services.map((service, serviceIndex) => {
                    const attended = attendedServiceIds.has(service.id);
                    const globalIndex = sortedServices.indexOf(service);
                    
                    return (
                      <Tooltip key={service.id}>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: globalIndex * 0.02 }}
                            className={`
                              w-8 h-8 rounded-lg cursor-pointer transition-all hover:scale-110 
                              flex items-center justify-center relative
                              ${attended 
                                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_12px_rgba(52,211,153,0.4)]' 
                                : 'bg-muted/40 hover:bg-muted/60 border border-border/50'
                              }
                            `}
                          >
                            {attended ? (
                              <Check className="w-4 h-4 text-white" strokeWidth={3} />
                            ) : (
                              <X className="w-3 h-3 text-muted-foreground/50" />
                            )}
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[200px]">
                          <p className="font-semibold">{service.name}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(service.service_date), 'EEEE, MMM d, yyyy')}
                          </p>
                          {service.branches?.name && (
                            <p className="text-muted-foreground text-[10px]">
                              {service.branches.name}
                            </p>
                          )}
                          <p className={`mt-1 ${attended ? 'text-emerald-400' : 'text-orange-400'}`}>
                            {attended ? '✓ Attended' : '✗ Missed'}
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

        {/* Legend */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">Service attendance</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
              <span className="text-xs text-muted-foreground">Attended</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-muted/40 border border-border/50 flex items-center justify-center">
                <X className="w-2 h-2 text-muted-foreground/50" />
              </div>
              <span className="text-xs text-muted-foreground">Missed</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
