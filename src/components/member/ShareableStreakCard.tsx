import { forwardRef } from "react";
import { Bird, Flame, Trophy, Star, Crown, Sparkles, Heart } from "lucide-react";

interface ShareableStreakCardProps {
  streak: number;
  totalAttendance: number;
  longestStreak: number;
  memberName?: string;
  churchName?: string;
}

const getStreakTier = (streak: number) => {
  if (streak >= 52) return { tier: "Legendary", color: "#f59e0b", icon: Crown };
  if (streak >= 26) return { tier: "Champion", color: "#8b5cf6", icon: Trophy };
  if (streak >= 12) return { tier: "Dedicated", color: "#3b82f6", icon: Star };
  if (streak >= 4) return { tier: "On Fire", color: "#f97316", icon: Flame };
  return { tier: "Rising", color: "#10b981", icon: Sparkles };
};

export const ShareableStreakCard = forwardRef<HTMLDivElement, ShareableStreakCardProps>(
  ({ streak, totalAttendance, longestStreak, memberName, churchName }, ref) => {
    const tierInfo = getStreakTier(streak);
    const TierIcon = tierInfo.icon;

    return (
      <div
        ref={ref}
        className="w-[400px] h-[520px] relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%)",
        }}
      >
        {/* Subtle border */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
          }}
        />

        {/* Platform branding - subtle top right */}
        <div className="absolute top-4 right-5">
          <span 
            className="text-[13px] font-medium tracking-wide"
            style={{ color: "#94a3b8" }}
          >
            easychurchflow
          </span>
        </div>

        {/* Main Content */}
        <div className="relative z-10 h-full flex flex-col items-center pt-12 pb-8 px-8">
          
          {/* Large Streak Number with Balloon Style */}
          <div className="relative flex items-start justify-center mb-4">
            {/* Balloon strings visual effect */}
            <div className="absolute top-[85%] left-1/2 -translate-x-1/2 w-20 h-16">
              <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
                <path d="M30 0 Q25 30, 40 55" stroke="#d1d5db" strokeWidth="1.5" fill="none" />
                <path d="M50 0 Q55 30, 40 55" stroke="#d1d5db" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            
            {/* Streak number styled like balloons */}
            <div className="relative">
              <span 
                className="text-[140px] font-black leading-none"
                style={{
                  color: "#f97316",
                  textShadow: "4px 4px 0 #ea580c, -2px -2px 0 #fdba74",
                  letterSpacing: "-0.03em",
                  fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif",
                }}
              >
                {streak}
              </span>
              {/* Balloon shine effect */}
              <div 
                className="absolute top-4 left-4 w-8 h-8 rounded-full opacity-40"
                style={{
                  background: "radial-gradient(circle at 30% 30%, white, transparent 70%)",
                }}
              />
            </div>
          </div>

          {/* Dove/Bird illustration */}
          <div className="relative -mt-2 mb-6">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
              }}
            >
              <Bird 
                className="w-12 h-12" 
                style={{ color: "#38bdf8" }}
                strokeWidth={1.5}
              />
            </div>
            {/* Small heart accent */}
            <Heart 
              className="absolute -right-1 top-0 w-5 h-5"
              style={{ color: "#fbbf24", fill: "#fbbf24" }}
            />
          </div>

          {/* Streak Label */}
          <h2 
            className="text-2xl font-bold text-center mb-3"
            style={{ color: "#1e293b" }}
          >
            {streak} Service Faith Streak!
          </h2>

          {/* Message */}
          <p 
            className="text-center text-base leading-relaxed mb-6 max-w-[280px]"
            style={{ color: "#64748b" }}
          >
            {memberName ? `${memberName} attended` : "You attended"} church services for{" "}
            <span className="font-semibold" style={{ color: "#f97316" }}>
              {streak} services
            </span>{" "}
            in a row!
            <br />
            <span className="font-medium">Praise the Lord! 🙌</span>
          </p>

          {/* Church Name */}
          {churchName && (
            <div 
              className="px-4 py-2 rounded-full mb-4"
              style={{ 
                background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                border: "1px solid #e2e8f0",
              }}
            >
              <span 
                className="text-sm font-semibold"
                style={{ color: "#475569" }}
              >
                ⛪ {churchName}
              </span>
            </div>
          )}

          {/* Tier Badge */}
          <div 
            className="px-5 py-2 rounded-full flex items-center gap-2 mb-auto"
            style={{ 
              background: `linear-gradient(135deg, ${tierInfo.color}15, ${tierInfo.color}25)`,
              border: `1.5px solid ${tierInfo.color}40`,
            }}
          >
            <TierIcon 
              className="w-4 h-4" 
              style={{ color: tierInfo.color }}
            />
            <span 
              className="text-sm font-bold tracking-wide"
              style={{ color: tierInfo.color }}
            >
              {tierInfo.tier}
            </span>
          </div>

          {/* Stats Row */}
          <div 
            className="flex justify-center gap-10 w-full py-4 mt-4"
            style={{ borderTop: "1px solid #e2e8f0" }}
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4" style={{ color: "#f59e0b" }} />
                <span className="text-xl font-bold" style={{ color: "#1e293b" }}>
                  {longestStreak}
                </span>
              </div>
              <p 
                className="text-[11px] font-medium uppercase tracking-wider mt-0.5"
                style={{ color: "#94a3b8" }}
              >
                Best Streak
              </p>
            </div>
            
            <div 
              className="w-px h-10"
              style={{ background: "#e2e8f0" }}
            />
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Star className="w-4 h-4" style={{ color: "#3b82f6" }} />
                <span className="text-xl font-bold" style={{ color: "#1e293b" }}>
                  {totalAttendance}
                </span>
              </div>
              <p 
                className="text-[11px] font-medium uppercase tracking-wider mt-0.5"
                style={{ color: "#94a3b8" }}
              >
                Total Services
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ShareableStreakCard.displayName = "ShareableStreakCard";
