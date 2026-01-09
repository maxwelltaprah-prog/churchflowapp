import { 
  LayoutDashboard, 
  Users,
  UsersRound,
  Building2, 
  Calendar, 
  QrCode, 
  BarChart3, 
  Settings,
  LogOut,
  ChevronDown,
  Church,
  ShieldCheck,
  Sparkles,
  UserPlus,
  CreditCard,
  Heart,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useChurch } from "@/hooks/useChurchData";
import { useTheme } from "@/hooks/useTheme";

const mainNavItems = [
  { title: "Care Dashboard", url: "/app", icon: LayoutDashboard, color: "kpi-purple" },
  { title: "People Directory", url: "/app/members", icon: Users, color: "kpi-blue" },
  { title: "Guests", url: "/app/visitors", icon: UserPlus, color: "kpi-teal" },
  { title: "Groups", url: "/app/groups", icon: UsersRound, color: "kpi-pink" },
  { title: "Locations", url: "/app/branches", icon: Building2, color: "kpi-amber" },
  { title: "Services", url: "/app/services", icon: Calendar, color: "kpi-green" },
  { title: "Scan to Connect", url: "/app/checkin", icon: QrCode, color: "kpi-orange" },
  { title: "Engagement Insights", url: "/app/analytics", icon: BarChart3, color: "kpi-purple" },
  { title: "Care Messages", url: "/app/sms", icon: Heart, color: "kpi-rose", adminOnly: true },
  { title: "Spiritual Journey", url: "/app/spiritual-journey", icon: Sparkles, color: "kpi-amber", adminOnly: true },
  { title: "Roles & Access", url: "/app/admins", icon: ShieldCheck, color: "kpi-teal", adminOnly: true },
];

const settingsNavItems = [
  { title: "Billing", url: "/app/billing", icon: CreditCard, color: "kpi-green", adminOnly: true },
  { title: "Settings", url: "/app/settings", icon: Settings, color: "kpi-purple" },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isChurchAdmin } = useAuth();
  const { data: church } = useChurch();
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const getThemeIcon = () => {
    if (theme === "light") return Sun;
    if (theme === "dark") return Moon;
    return Monitor;
  };

  const getThemeLabel = () => {
    if (theme === "light") return "Light mode";
    if (theme === "dark") return "Dark mode";
    return "System theme";
  };

  const ThemeIcon = getThemeIcon();

  const isActive = (path: string) => {
    if (path === "/app") {
      return location.pathname === "/app";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleLabel = () => {
    if (isChurchAdmin()) return "Church Admin";
    return "Staff";
  };

  // Color class mapping for dynamic styles
  const getColorClasses = (color: string, active: boolean) => {
    const colorMap: Record<string, { bg: string; text: string; hover: string; glow: string }> = {
      "kpi-purple": { bg: "bg-kpi-purple/15", text: "text-kpi-purple", hover: "hover:bg-kpi-purple/10", glow: "shadow-kpi-purple/20" },
      "kpi-blue": { bg: "bg-kpi-blue/15", text: "text-kpi-blue", hover: "hover:bg-kpi-blue/10", glow: "shadow-kpi-blue/20" },
      "kpi-teal": { bg: "bg-kpi-teal/15", text: "text-kpi-teal", hover: "hover:bg-kpi-teal/10", glow: "shadow-kpi-teal/20" },
      "kpi-pink": { bg: "bg-kpi-pink/15", text: "text-kpi-pink", hover: "hover:bg-kpi-pink/10", glow: "shadow-kpi-pink/20" },
      "kpi-amber": { bg: "bg-kpi-amber/15", text: "text-kpi-amber", hover: "hover:bg-kpi-amber/10", glow: "shadow-kpi-amber/20" },
      "kpi-green": { bg: "bg-kpi-green/15", text: "text-kpi-green", hover: "hover:bg-kpi-green/10", glow: "shadow-kpi-green/20" },
      "kpi-orange": { bg: "bg-kpi-orange/15", text: "text-kpi-orange", hover: "hover:bg-kpi-orange/10", glow: "shadow-kpi-orange/20" },
      "kpi-rose": { bg: "bg-kpi-rose/15", text: "text-kpi-rose", hover: "hover:bg-kpi-rose/10", glow: "shadow-kpi-rose/20" },
    };
    return colorMap[color] || colorMap["kpi-purple"];
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-kpi-purple to-kpi-blue flex items-center justify-center shadow-lg shadow-kpi-purple/30 flex-shrink-0">
            <Church className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sidebar-foreground truncate">ChurchFlow</span>
              <span className="text-xs text-sidebar-foreground/60 truncate">
                {church?.name || "Loading..."}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold px-3 py-2">
            {collapsed ? "" : "Main Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems
                .filter((item) => !('adminOnly' in item) || (item.adminOnly && isChurchAdmin()))
                .map((item) => {
                  const active = isActive(item.url);
                  const colors = getColorClasses(item.color, active);
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.url === "/app"}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                            active
                              ? `${colors.bg} ${colors.text} font-medium shadow-md ${colors.glow}`
                              : `text-sidebar-foreground/70 ${colors.hover} hover:text-sidebar-foreground`
                          )}
                        >
                          <div className={cn(
                            "p-1.5 rounded-lg transition-all",
                            active ? `bg-white/10` : "group-hover:bg-white/5"
                          )}>
                            <item.icon className={cn(
                              "w-4 h-4 flex-shrink-0 transition-colors",
                              active ? colors.text : "group-hover:" + colors.text
                            )} />
                          </div>
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold px-3 py-2">
            {collapsed ? "" : "System"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {settingsNavItems
                .filter((item) => !('adminOnly' in item) || (item.adminOnly && isChurchAdmin()))
                .map((item) => {
                  const active = isActive(item.url);
                  const colors = getColorClasses(item.color, active);
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                            active
                              ? `${colors.bg} ${colors.text} font-medium shadow-md ${colors.glow}`
                              : `text-sidebar-foreground/70 ${colors.hover} hover:text-sidebar-foreground`
                          )}
                        >
                          <div className={cn(
                            "p-1.5 rounded-lg transition-all",
                            active ? `bg-white/10` : "group-hover:bg-white/5"
                          )}>
                            <item.icon className={cn(
                              "w-4 h-4 flex-shrink-0 transition-colors",
                              active ? colors.text : "group-hover:" + colors.text
                            )} />
                          </div>
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-kpi-purple/10 transition-all duration-200 group">
              <Avatar className="w-8 h-8 ring-2 ring-kpi-purple/30">
                <AvatarFallback className="bg-gradient-to-br from-kpi-purple to-kpi-blue text-white text-sm font-medium">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-sidebar-foreground truncate">
                      {profile?.full_name || "User"}
                    </div>
                    <div className="text-xs text-sidebar-foreground/60 truncate">{getRoleLabel()}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-sidebar-foreground/50 group-hover:text-kpi-purple transition-colors" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={cycleTheme}>
              <ThemeIcon className="w-4 h-4 mr-2" />
              {getThemeLabel()}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/app/settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
