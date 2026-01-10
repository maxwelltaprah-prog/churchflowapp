import { forwardRef } from "react";
import { Flame, TrendingUp, Calendar, Sparkles, Target } from "lucide-react";

interface ShareableStreakCardProps {
  streak: number;
  totalAttendance: number;
  longestStreak: number;
  thisMonthCount: number;
  memberName?: string;
  churchName?: string;
}

const getStreakTier = (streak: number) => {
  if (streak >= 52) return { tier: "LEGENDARY", emoji: "🎖️" };
  if (streak >= 26) return { tier: "CHAMPION", emoji: "👑" };
  if (streak >= 12) return { tier: "DEDICATED", emoji: "🏆" };
  if (streak >= 4) return { tier: "ON FIRE", emoji: "🔥" };
  if (streak >= 1) return { tier: "RISING", emoji: "🌱" };
  return { tier: "STARTING", emoji: "🙏" };
};

const getMotivationalMessage = (streak: number) => {
  if (streak >= 52) return "Incredible dedication!";
  if (streak >= 26) return "You're unstoppable!";
  if (streak >= 12) return "Amazing commitment!";
  if (streak >= 4) return "Keep this streak alive!";
  if (streak >= 1) return "Building consistency!";
  return "Start your journey!";
};

export const ShareableStreakCard = forwardRef<HTMLDivElement, ShareableStreakCardProps>(
  ({ streak, totalAttendance, longestStreak, thisMonthCount, memberName, churchName }, ref) => {
    const tierInfo = getStreakTier(streak);
    const motivationalMessage = getMotivationalMessage(streak);
    const nextMilestone = streak < 4 ? 4 : streak < 8 ? 8 : streak < 12 ? 12 : streak < 26 ? 26 : streak < 52 ? 52 : 100;
    const progress = Math.min((streak / nextMilestone) * 100, 100);

    return (
      <div
        ref={ref}
        className="w-[400px] h-[600px] relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)",
        }}
      >
        {/* Background glow effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute w-[300px] h-[300px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(249, 115, 22, 0.25) 0%, transparent 60%)",
              top: "15%",
              left: "20%",
              filter: "blur(40px)",
            }}
          />
          <div 
            className="absolute w-[200px] h-[200px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)",
              bottom: "20%",
              right: "10%",
              filter: "blur(50px)",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center px-8 py-8">
          
          {/* Platform branding - subtle */}
          <div className="w-full flex justify-end mb-2">
            <span 
              className="text-[11px] font-medium tracking-wide"
              style={{ color: "rgba(148, 163, 184, 0.6)" }}
            >
              easychurchflow
            </span>
          </div>

          {/* Church Name */}
          {churchName && (
            <div 
              className="px-4 py-1.5 rounded-full mb-6"
              style={{ 
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3" style={{ color: "#fbbf24" }} />
                <span 
                  className="text-xs font-semibold tracking-wide uppercase"
                  style={{ color: "rgba(255, 255, 255, 0.9)" }}
                >
                  {churchName}
                </span>
                <Sparkles className="w-3 h-3" style={{ color: "#fbbf24" }} />
              </div>
            </div>
          )}

          {/* Main Streak Circle */}
          <div className="relative mb-4">
            {/* Outer ring */}
            <svg width="180" height="180" viewBox="0 0 180 180">
              {/* Background ring */}
              <circle
                cx="90"
                cy="90"
                r="80"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="12"
              />
              {/* Progress ring */}
              <circle
                cx="90"
                cy="90"
                r="80"
                fill="none"
                stroke="url(#streakGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${progress * 5.02} 502`}
                transform="rotate(-90 90 90)"
              />
              <defs>
                <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center content */}
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <Flame className="w-10 h-10 mb-1" style={{ color: streak > 0 ? "#f97316" : "#64748b" }} />
              <span 
                className="text-5xl font-black"
                style={{ color: "#ffffff" }}
              >
                {streak}
              </span>
              <span 
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "rgba(255, 255, 255, 0.6)" }}
              >
                service streak
              </span>
            </div>
          </div>

          {/* Progress to milestone */}
          <div className="flex items-center gap-2 mb-4" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            <Target className="w-4 h-4" />
            <span className="text-sm">{nextMilestone - streak} services to next milestone</span>
          </div>

          {/* Tier Badge */}
          <div 
            className="px-5 py-2 rounded-full mb-3"
            style={{ 
              background: "linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 179, 8, 0.2))",
              border: "1px solid rgba(249, 115, 22, 0.3)",
            }}
          >
            <span className="text-sm font-bold tracking-wider" style={{ color: "#f97316" }}>
              {tierInfo.tier}
            </span>
          </div>

          {/* Motivational message */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles className="w-4 h-4" style={{ color: "#fbbf24" }} />
              <span className="text-xl">{tierInfo.emoji}</span>
              <Sparkles className="w-4 h-4" style={{ color: "#fbbf24" }} />
            </div>
            <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.8)" }}>
              {motivationalMessage}
            </p>
          </div>

          {/* Member Name */}
          {memberName && (
            <p className="text-sm font-medium mb-4" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
              {memberName}
            </p>
          )}

          {/* Stats Grid */}
          <div className="w-full grid grid-cols-2 gap-3 mt-auto">
            <div 
              className="rounded-2xl p-4 text-center"
              style={{ 
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div 
                className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2"
                style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}
              >
                <TrendingUp className="w-5 h-5" style={{ color: "#ffffff" }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: "#ffffff" }}>{longestStreak}</p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255, 255, 255, 0.6)" }}>Best Streak</p>
            </div>
            
            <div 
              className="rounded-2xl p-4 text-center"
              style={{ 
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div 
                className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2"
                style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
              >
                <Calendar className="w-5 h-5" style={{ color: "#ffffff" }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: "#ffffff" }}>{thisMonthCount}</p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255, 255, 255, 0.6)" }}>This Month</p>
            </div>
            
            <div 
              className="col-span-2 rounded-2xl p-4 text-center"
              style={{ 
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <p 
                className="text-3xl font-bold"
                style={{ 
                  background: "linear-gradient(90deg, #f97316, #f59e0b, #eab308)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {totalAttendance}
              </p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255, 255, 255, 0.6)" }}>Total Services Attended</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ShareableStreakCard.displayName = "ShareableStreakCard";
