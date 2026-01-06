import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation } from "react-router-dom";
import { AdminNotifications } from "./AdminNotifications";

const routeTitles: Record<string, string> = {
  "/app": "Dashboard",
  "/app/members": "Members",
  "/app/groups": "Groups",
  "/app/branches": "Branches",
  "/app/services": "Services",
  "/app/checkin": "Check-in",
  "/app/analytics": "Analytics",
  "/app/analytics/attendance": "Attendance Analytics",
  "/app/analytics/demographics": "Demographics",
  "/app/analytics/members": "Member Growth",
  "/app/analytics/groups": "Groups & Ministries",
  "/app/analytics/groups/absentees": "Group Absentees",
  "/app/analytics/quality": "Service Quality",
  
  "/app/analytics/drilldown": "Member Drilldown",
  "/app/broadcasts": "Broadcasts",
  "/app/admins": "Administrators & Access",
  "/app/settings": "Settings",
};

export function DashboardLayout() {
  const location = useLocation();
  const currentTitle = routeTitles[location.pathname] || "Dashboard";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <DashboardSidebar />
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/app">ChurchFlow</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentTitle}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <AdminNotifications />
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
