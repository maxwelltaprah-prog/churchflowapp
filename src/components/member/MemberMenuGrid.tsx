import { useState } from "react";
import { 
  QrCode, 
  Wallet, 
  Download, 
  Sparkles, 
  User,
  Flame,
  HandHeart
} from "lucide-react";
import { MemberMenuCard } from "./MemberMenuCard";

export type MenuSection = 
  | "home" 
  | "checkin" 
  | "tithes" 
  | "downloads" 
  | "engagement" 
  | "streak"
  | "profile";

interface MemberMenuGridProps {
  onNavigate: (section: MenuSection) => void;
  hasDownloads?: boolean;
  hasEngagement?: boolean;
}

export function MemberMenuGrid({ 
  onNavigate, 
  hasDownloads = false,
  hasEngagement = false 
}: MemberMenuGridProps) {
  const menuItems = [
    {
      id: "checkin" as MenuSection,
      title: "Check In",
      icon: QrCode,
      gradient: "from-emerald-600 to-emerald-800",
      show: true
    },
    {
      id: "tithes" as MenuSection,
      title: "My Giving",
      icon: Wallet,
      gradient: "from-amber-500 to-amber-700",
      show: true
    },
    {
      id: "streak" as MenuSection,
      title: "My Streak",
      icon: Flame,
      gradient: "from-orange-500 to-red-600",
      show: true
    },
    {
      id: "engagement" as MenuSection,
      title: "Engagement",
      icon: Sparkles,
      gradient: "from-violet-500 to-purple-700",
      show: hasEngagement
    },
    {
      id: "downloads" as MenuSection,
      title: "Downloads",
      icon: Download,
      gradient: "from-blue-500 to-blue-700",
      show: hasDownloads
    },
    {
      id: "profile" as MenuSection,
      title: "My Profile",
      icon: User,
      gradient: "from-slate-600 to-slate-800",
      show: true
    }
  ];

  const visibleItems = menuItems.filter(item => item.show);

  return (
    <div className="grid grid-cols-2 gap-4">
      {visibleItems.map((item) => (
        <MemberMenuCard
          key={item.id}
          title={item.title}
          icon={item.icon}
          gradient={item.gradient}
          onClick={() => onNavigate(item.id)}
        />
      ))}
    </div>
  );
}
