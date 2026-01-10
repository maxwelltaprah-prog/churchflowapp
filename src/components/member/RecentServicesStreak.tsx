import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface ChurchService {
  id: string;
  name: string;
  service_date: string;
  branches: { name: string } | null;
}

interface RecentServicesStreakProps {
  services: ChurchService[];
  attendedServiceIds: Set<string>;
  currentStreak: number;
}

export function RecentServicesStreak({ 
  services, 
  attendedServiceIds, 
  currentStreak 
}: RecentServicesStreakProps) {
  // Show last 10 services
  const recentServices = services.slice(0, 10);

  if (recentServices.length === 0) {
    return null;
  }

  // Find first missed service in the streak
  const firstMissedIndex = recentServices.findIndex(s => !attendedServiceIds.has(s.id));

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            Recent Services
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Last {recentServices.length} services</span>
          </div>
        </div>
        {currentStreak > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            🔥 You've attended the last <span className="font-semibold text-primary">{currentStreak}</span> consecutive service{currentStreak !== 1 ? 's' : ''}!
          </p>
        )}
        {currentStreak === 0 && recentServices.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Attend the next service to start building your streak!
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
          {recentServices.map((service, index) => {
            const attended = attendedServiceIds.has(service.id);
            const isStreakBreaker = !attended && index === firstMissedIndex && currentStreak > 0;
            
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  attended 
                    ? "bg-green-500/10 border border-green-500/20" 
                    : isStreakBreaker
                    ? "bg-orange-500/10 border border-orange-500/30"
                    : "bg-muted/30 border border-border/50"
                }`}
              >
                <div className={`shrink-0 ${attended ? "text-green-500" : isStreakBreaker ? "text-orange-500" : "text-muted-foreground"}`}>
                  {attended ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    attended ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {service.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(service.service_date), "EEE, MMM d, yyyy")}
                    {service.branches?.name && ` • ${service.branches.name}`}
                  </p>
                </div>

                <div className="shrink-0">
                  {attended ? (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                      Attended
                    </span>
                  ) : isStreakBreaker ? (
                    <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">
                      Streak reset
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      Missed
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span>Attended</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-orange-500" />
            <span>Streak reset</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Missed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
