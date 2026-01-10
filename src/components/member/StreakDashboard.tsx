import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StreakRing } from "./StreakRing";
import { StreakFlame } from "./StreakFlame";
import { MilestoneBadge } from "./MilestoneBadge";
import { WeeklyHeatmap } from "./WeeklyHeatmap";
import { MilestoneConfetti, usePreviousStreak } from "./MilestoneConfetti";
import { Calendar, TrendingUp, Target, Sparkles, Activity } from "lucide-react";

interface AttendanceStats {
  totalAttendance: number;
  currentStreak: number;
  longestStreak: number;
  thisMonthCount: number;
  lastAttendance: string | null;
}

interface StreakDashboardProps {
  stats: AttendanceStats | null;
  attendanceDates: string[];
}

const motivationalMessages = [
  { min: 0, max: 0, message: "Start your journey! Your first service awaits.", emoji: "🙏" },
  { min: 1, max: 1, message: "You've started! Keep the momentum going!", emoji: "🌱" },
  { min: 2, max: 3, message: "Building consistency! You're forming a habit.", emoji: "💪" },
  { min: 4, max: 7, message: "Incredible dedication! Keep it up!", emoji: "🔥" },
  { min: 8, max: 11, message: "You're on fire! Keep this streak alive!", emoji: "⭐" },
  { min: 12, max: 25, message: "Amazing commitment! Your dedication inspires others.", emoji: "🏆" },
  { min: 26, max: 51, message: "Streak hero! You're unstoppable!", emoji: "👑" },
  { min: 52, max: Infinity, message: "LEGENDARY! Incredible dedication!", emoji: "🎖️" },
];

export function StreakDashboard({ stats, attendanceDates }: StreakDashboardProps) {
  const streak = stats?.currentStreak || 0;
  const previousStreak = usePreviousStreak(streak);
  const nextMilestone = streak < 4 ? 4 : streak < 8 ? 8 : streak < 12 ? 12 : streak < 26 ? 26 : streak < 52 ? 52 : 100;
  const progress = (streak / nextMilestone) * 100;
  
  const motivationalMessage = motivationalMessages.find(m => streak >= m.min && streak <= m.max) || motivationalMessages[0];

  return (
    <div className="space-y-6">
      {/* Confetti celebration for milestones */}
      <MilestoneConfetti streak={streak} previousStreak={previousStreak} />
      {/* Main Streak Hero Card */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative">
        {/* Animated background glow */}
        {streak > 0 && (
          <motion.div
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at 30% 50%, hsl(25 95% 55% / 0.4), transparent 50%),
                          radial-gradient(circle at 70% 50%, hsl(var(--primary) / 0.3), transparent 50%)`
            }}
            animate={{
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
        
        <CardContent className="pt-8 pb-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left: Streak Ring with Flame */}
            <div className="flex flex-col items-center gap-4">
              <StreakRing value={streak} max={nextMilestone} size={180} strokeWidth={14}>
                <div className="flex flex-col items-center">
                  <StreakFlame streak={streak} size="lg" />
                  <motion.p 
                    className="text-5xl font-black mt-1"
                    key={streak}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    {streak}
                  </motion.p>
                  <p className="text-sm text-white/60 font-medium">service streak</p>
                </div>
              </StreakRing>
              
              {/* Progress to next milestone */}
              <div className="text-center">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Target className="w-4 h-4" />
                  <span>{nextMilestone - streak} services to next milestone</span>
                </div>
                <div className="w-48 h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-primary via-orange-500 to-yellow-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* Center: Milestone Badge */}
            <div className="flex flex-col items-center gap-4">
              <MilestoneBadge streak={streak} />
              
              {/* Motivational message */}
              <motion.div 
                className="text-center max-w-xs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-2xl">{motivationalMessage.emoji}</span>
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-white/80 text-sm leading-relaxed">
                  {motivationalMessage.message}
                </p>
              </motion.div>
            </div>

            {/* Right: Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                className="bg-white/5 backdrop-blur rounded-2xl p-4 text-center border border-white/10"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-2">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <p className="text-3xl font-bold">{stats?.longestStreak || 0}</p>
                <p className="text-xs text-white/60">Best Streak</p>
              </motion.div>
              
              <motion.div 
                className="bg-white/5 backdrop-blur rounded-2xl p-4 text-center border border-white/10"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-2">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <p className="text-3xl font-bold">{stats?.thisMonthCount || 0}</p>
                <p className="text-xs text-white/60">This Month</p>
              </motion.div>
              
              <motion.div 
                className="col-span-2 bg-white/5 backdrop-blur rounded-2xl p-4 text-center border border-white/10"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                <p className="text-4xl font-bold bg-gradient-to-r from-primary via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  {stats?.totalAttendance || 0}
                </p>
                <p className="text-xs text-white/60">Total Services Attended</p>
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              Activity Overview
            </CardTitle>
            {stats?.lastAttendance && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Last attended</p>
                <p className="text-sm font-medium">
                  {new Date(stats.lastAttendance).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <WeeklyHeatmap attendanceDates={attendanceDates} weeks={16} />
        </CardContent>
      </Card>
    </div>
  );
}
