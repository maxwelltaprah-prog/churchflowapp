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
import { TrialBanner } from "@/components/billing/TrialBanner";
import { PaywallLock } from "@/components/billing/PaywallLock";
import { OnboardingTour } from "./OnboardingTour";

const routeTitles: Record<string, string> = {
  "/app": "Care Dashboard",
  "/app/members": "People Directory",
  "/app/groups": "Groups",
  "/app/branches": "Locations",
  "/app/services": "Services",
  "/app/checkin": "Scan to Connect",
  "/app/tithes": "Tithe Management",
  "/app/analytics": "Engagement Insights",
  "/app/analytics/attendance": "Engagement Analytics",
  "/app/analytics/demographics": "Demographics",
  "/app/analytics/members": "Member Growth",
  "/app/analytics/groups": "Groups & Ministries",
  "/app/analytics/groups/absentees": "Group Absentees",
  "/app/analytics/quality": "Service Quality",
  "/app/analytics/drilldown": "Member Drilldown",
  "/app/broadcasts": "Care Messages",
  "/app/admins": "Roles & Access",
  "/app/billing": "Billing & Subscription",
  "/app/settings": "Settings",
  "/app/visitors": "Guests",
  "/app/sms": "SMS",
};

export function DashboardLayout() {
  const location = useLocation();
  const currentTitle = routeTitles[location.pathname] || "Care Dashboard";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-card sticky top-0 z-10">
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
            <TrialBanner />
            <Outlet />
          </main>
          
          {/* Paywall Lock Overlay */}
          <PaywallLock />
          
          {/* Onboarding Tour for new admins */}
          <OnboardingTour />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
