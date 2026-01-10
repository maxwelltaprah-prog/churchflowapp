import { forwardRef } from "react";
import { Flame, Trophy, Zap, Star, Crown, Sparkles } from "lucide-react";

interface ShareableStreakCardProps {
  streak: number;
  totalAttendance: number;
  longestStreak: number;
  memberName?: string;
  churchName?: string;
}

const getStreakTier = (streak: number) => {
  if (streak >= 52) return { tier: "LEGENDARY", gradient: "from-amber-300 via-yellow-400 to-orange-400", icon: Crown, bgGlow: "#fbbf24" };
  if (streak >= 26) return { tier: "CHAMPION", gradient: "from-violet-400 via-purple-500 to-fuchsia-500", icon: Trophy, bgGlow: "#a855f7" };
  if (streak >= 12) return { tier: "DEDICATED", gradient: "from-cyan-400 via-blue-500 to-indigo-500", icon: Star, bgGlow: "#3b82f6" };
  if (streak >= 4) return { tier: "ON FIRE", gradient: "from-orange-400 via-red-500 to-rose-500", icon: Zap, bgGlow: "#f97316" };
  return { tier: "RISING", gradient: "from-emerald-400 via-green-500 to-teal-500", icon: Flame, bgGlow: "#10b981" };
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
          background: "linear-gradient(160deg, #0c0a1d 0%, #1a1333 35%, #0f172a 70%, #0c1220 100%)",
        }}
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Main glow orb */}
          <div 
            className="absolute w-[400px] h-[400px] rounded-full"
            style={{
              background: `radial-gradient(circle, ${tierInfo.bgGlow}30 0%, transparent 60%)`,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              filter: "blur(40px)",
            }}
          />
          
          {/* Top accent glow */}
          <div 
            className="absolute w-[200px] h-[200px] rounded-full"
            style={{
              background: `radial-gradient(circle, ${tierInfo.bgGlow}40 0%, transparent 70%)`,
              top: "-50px",
              right: "-30px",
              filter: "blur(50px)",
            }}
          />
          
          {/* Bottom accent */}
          <div 
            className="absolute w-[250px] h-[150px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)",
              bottom: "-30px",
              left: "-40px",
              filter: "blur(40px)",
            }}
          />

          {/* Subtle grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
          
          {/* Floating particles */}
          <div className="absolute top-[15%] left-[10%] w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="absolute top-[25%] right-[15%] w-1 h-1 rounded-full bg-white/30" />
          <div className="absolute bottom-[30%] left-[20%] w-1 h-1 rounded-full bg-white/20" />
          <div className="absolute bottom-[20%] right-[25%] w-1.5 h-1.5 rounded-full bg-white/15" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-between px-8 py-10">
          
          {/* Church Name Header */}
          <div className="text-center w-full">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-white/90 text-sm font-semibold tracking-wide uppercase">
                {churchName || "My Church"}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>

          {/* Main Streak Display */}
          <div className="flex flex-col items-center -mt-2">
            {/* Flame emoji with glow */}
            <div className="relative mb-3">
              <div 
                className="absolute inset-0 blur-xl opacity-60"
                style={{ background: `radial-gradient(circle, ${tierInfo.bgGlow}, transparent 70%)` }}
              />
              <span className="relative text-7xl drop-shadow-lg">🔥</span>
            </div>

            {/* Streak Number */}
            <div className="relative">
              <span 
                className={`text-[120px] font-black leading-none bg-gradient-to-b ${tierInfo.gradient} bg-clip-text text-transparent`}
                style={{
                  filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.3))",
                  letterSpacing: "-0.02em",
                }}
              >
                {streak}
              </span>
            </div>

            {/* Service Streak Label */}
            <p className="text-white/60 text-base font-medium tracking-[0.2em] uppercase mt-1">
              Service Streak
            </p>

            {/* Tier Badge */}
            <div 
              className={`mt-4 px-5 py-1.5 rounded-full bg-gradient-to-r ${tierInfo.gradient} shadow-lg`}
              style={{
                boxShadow: `0 4px 20px ${tierInfo.bgGlow}40`,
              }}
            >
              <div className="flex items-center gap-2">
                <TierIcon className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm tracking-wider">
                  {tierInfo.tier}
                </span>
              </div>
            </div>

            {/* Member Name */}
            {memberName && (
              <p className="mt-4 text-white/70 text-sm font-medium">
                {memberName}
              </p>
            )}
          </div>

          {/* Stats Footer */}
          <div className="w-full">
            {/* Stats Row */}
            <div className="flex justify-center gap-8 mb-5">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-2xl font-bold text-white">{longestStreak}</span>
                </div>
                <p className="text-white/40 text-[10px] font-semibold tracking-wider uppercase mt-0.5">Best Streak</p>
              </div>
              
              <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Star className="w-4 h-4 text-blue-400" />
                  <span className="text-2xl font-bold text-white">{totalAttendance}</span>
                </div>
                <p className="text-white/40 text-[10px] font-semibold tracking-wider uppercase mt-0.5">Total Services</p>
              </div>
            </div>

            {/* Branding Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-white/30 text-[10px] font-medium">
                <span>#ChurchFlow</span>
                <span>•</span>
                <span>#FaithfulAttendance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${tierInfo.bgGlow}, #f97316)`,
                  }}
                >
                  <Flame className="w-3 h-3 text-white" />
                </div>
                <span className="text-white/50 text-[10px] font-bold tracking-wide">CHURCHFLOW</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ShareableStreakCard.displayName = "ShareableStreakCard";
