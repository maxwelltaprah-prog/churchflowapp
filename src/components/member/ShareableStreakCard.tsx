import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, Zap, Star, Crown, Target } from "lucide-react";

interface ShareableStreakCardProps {
  streak: number;
  totalAttendance: number;
  longestStreak: number;
  memberName?: string;
  churchName?: string;
}

const getStreakTier = (streak: number) => {
  if (streak >= 52) return { tier: "LEGENDARY", color: "from-yellow-400 via-amber-500 to-orange-600", icon: Crown, emoji: "👑" };
  if (streak >= 26) return { tier: "CHAMPION", color: "from-purple-400 via-pink-500 to-rose-500", icon: Trophy, emoji: "🏆" };
  if (streak >= 12) return { tier: "DEDICATED", color: "from-blue-400 via-cyan-500 to-teal-500", icon: Star, emoji: "⭐" };
  if (streak >= 4) return { tier: "RISING", color: "from-orange-400 via-red-500 to-pink-500", icon: Zap, emoji: "🔥" };
  return { tier: "STARTER", color: "from-green-400 via-emerald-500 to-teal-500", icon: Flame, emoji: "🌱" };
};

export const ShareableStreakCard = forwardRef<HTMLDivElement, ShareableStreakCardProps>(
  ({ streak, totalAttendance, longestStreak, memberName, churchName }, ref) => {
    const tierInfo = getStreakTier(streak);
    const TierIcon = tierInfo.icon;

    return (
      <div
        ref={ref}
        className="w-[400px] h-[500px] relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0">
          {/* Gradient orbs */}
          <div 
            className="absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-40"
            style={{
              background: `linear-gradient(${tierInfo.color.replace('from-', '').replace('via-', '').replace('to-', '').split(' ').map(c => `var(--${c})`).join(', ')})`,
              top: "-50px",
              right: "-50px",
            }}
          />
          <div 
            className="absolute w-[250px] h-[250px] rounded-full blur-[60px] opacity-30"
            style={{
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              bottom: "-30px",
              left: "-30px",
            }}
          />
          
          {/* Subtle pattern overlay */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-between p-8">
          {/* Header */}
          <div className="text-center">
            {churchName && (
              <p className="text-white/50 text-xs font-medium tracking-widest uppercase mb-1">
                {churchName}
              </p>
            )}
            {memberName && (
              <p className="text-white/80 text-sm font-semibold">
                {memberName}
              </p>
            )}
          </div>

          {/* Main Streak Display */}
          <div className="flex flex-col items-center gap-4 -mt-4">
            {/* Tier Badge */}
            <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${tierInfo.color} shadow-lg`}>
              <div className="flex items-center gap-2">
                <TierIcon className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm tracking-wider">
                  {tierInfo.tier}
                </span>
              </div>
            </div>

            {/* Streak Number with Glow */}
            <div className="relative">
              {/* Glow effect */}
              <div 
                className="absolute inset-0 blur-2xl opacity-60"
                style={{
                  background: `radial-gradient(circle, #f97316, transparent 70%)`,
                }}
              />
              
              {/* Flame icon */}
              <div className="relative flex flex-col items-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [-2, 2, -2],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="text-6xl mb-2"
                >
                  🔥
                </motion.div>
                
                <div className="flex items-baseline gap-2">
                  <span 
                    className="text-8xl font-black bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent"
                    style={{
                      textShadow: "0 4px 30px rgba(249, 115, 22, 0.5)",
                      WebkitTextStroke: "1px rgba(255,255,255,0.1)",
                    }}
                  >
                    {streak}
                  </span>
                </div>
                
                <p className="text-white/70 text-lg font-semibold tracking-wide mt-1">
                  SERVICE STREAK
                </p>
              </div>
            </div>

            {/* Motivational text */}
            <p className="text-white/60 text-center text-sm max-w-[280px] leading-relaxed">
              {streak === 0 
                ? "Ready to start my journey! 🙏"
                : streak >= 52 
                ? "A whole year of dedication! Unstoppable! 🎖️"
                : streak >= 26 
                ? "Half a year strong! Nothing can stop me! 💪"
                : streak >= 12
                ? "Consistent and committed! Building habits! 🌟"
                : streak >= 4
                ? "On fire! The streak continues! 🔥"
                : "Just getting started! Watch me grow! 🌱"
              }
            </p>
          </div>

          {/* Stats Row */}
          <div className="w-full">
            <div className="flex justify-center gap-6 mb-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-2xl font-bold text-white">{longestStreak}</span>
                </div>
                <p className="text-white/50 text-xs font-medium">BEST STREAK</p>
              </div>
              
              <div className="w-px h-12 bg-white/20" />
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Target className="w-4 h-4 text-blue-400" />
                  <span className="text-2xl font-bold text-white">{totalAttendance}</span>
                </div>
                <p className="text-white/50 text-xs font-medium">TOTAL SERVICES</p>
              </div>
            </div>

            {/* CTA and Branding */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <span>#ChurchFlow</span>
                <span>•</span>
                <span>#AttendanceStreak</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                  <Flame className="w-3 h-3 text-white" />
                </div>
                <span className="text-white/60 text-xs font-semibold">ChurchFlow</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ShareableStreakCard.displayName = "ShareableStreakCard";
