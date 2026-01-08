import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ChurchSignup from "./pages/ChurchSignup";
import SetupChurch from "./pages/SetupChurch";
import JoinBranch from "./pages/JoinBranch";
import NotFound from "./pages/NotFound";
import MemberLogin from "./pages/MemberLogin";
import CreateMemberPin from "./pages/CreateMemberPin";
import MemberPortal from "./pages/MemberPortal";
import SelfCheckin from "./pages/SelfCheckin";

// Dashboard imports
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import MembersPage from "./pages/dashboard/MembersPage";
import MemberProfilePage from "./pages/dashboard/MemberProfilePage";
import GroupsPage from "./pages/dashboard/GroupsPage";
import BranchesPage from "./pages/dashboard/BranchesPage";
import CheckinPage from "./pages/dashboard/CheckinPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import ServicesPage from "./pages/dashboard/ServicesPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import AttendanceOverviewPage from "./pages/dashboard/analytics/AttendanceOverviewPage";
import DemographicsPage from "./pages/dashboard/analytics/DemographicsPage";
import MemberGrowthPage from "./pages/dashboard/analytics/MemberGrowthPage";
import GroupsAnalyticsPage from "./pages/dashboard/analytics/GroupsAnalyticsPage";
import ServiceQualityPage from "./pages/dashboard/analytics/ServiceQualityPage";
import MemberDrilldownPage from "./pages/dashboard/analytics/MemberDrilldownPage";
import GroupAbsenteesPage from "./pages/dashboard/analytics/GroupAbsenteesPage";
import EngagementSignalsPage from "./pages/dashboard/analytics/EngagementSignalsPage";
import MembersAttendedPage from "./pages/dashboard/analytics/MembersAttendedPage";

import BroadcastsPage from "./pages/dashboard/BroadcastsPage";
import AdminsPage from "./pages/dashboard/AdminsPage";
import SpiritualJourneyPage from "./pages/dashboard/SpiritualJourneyPage";
import SMSDashboardPage from "./pages/dashboard/SMSDashboardPage";
import SendSMSPage from "./pages/dashboard/SendSMSPage";
import BillingPage from "./pages/dashboard/BillingPage";
import BillingCallbackPage from "./pages/dashboard/BillingCallbackPage";

// Visitor Management imports
import VisitorsPage from "./pages/dashboard/VisitorsPage";
import RegisterVisitorPage from "./pages/dashboard/RegisterVisitorPage";
import VisitorDetailsPage from "./pages/dashboard/VisitorDetailsPage";
import EditVisitorPage from "./pages/dashboard/EditVisitorPage";
import AddFollowupPage from "./pages/dashboard/AddFollowupPage";
import AddMemberPage from "./pages/dashboard/AddMemberPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup/church" element={<ChurchSignup />} />
            <Route path="/join" element={<JoinBranch />} />
            <Route path="/setup-church" element={<SetupChurch />} />
            
            {/* Member Routes */}
            <Route path="/member-login" element={<MemberLogin />} />
            <Route path="/member/login" element={<MemberLogin />} />
            <Route path="/create-pin" element={<CreateMemberPin />} />
            <Route path="/member" element={<MemberPortal />} />
            
            {/* Self Check-in (Public) */}
            <Route path="/self-checkin/:serviceId" element={<SelfCheckin />} />

            {/* Admin Dashboard Routes */}
            <Route path="/app" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="members/new" element={<AddMemberPage />} />
              <Route path="members/:memberId" element={<MemberProfilePage />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="branches" element={<BranchesPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="checkin" element={<CheckinPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="analytics/attendance" element={<AttendanceOverviewPage />} />
              <Route path="analytics/demographics" element={<DemographicsPage />} />
              <Route path="analytics/members" element={<MemberGrowthPage />} />
              <Route path="analytics/groups" element={<GroupsAnalyticsPage />} />
              <Route path="analytics/groups/absentees" element={<GroupAbsenteesPage />} />
              <Route path="analytics/quality" element={<ServiceQualityPage />} />
              <Route path="analytics/engagement" element={<EngagementSignalsPage />} />
              
              <Route path="analytics/drilldown" element={<MemberDrilldownPage />} />
              <Route path="analytics/members-attended" element={<MembersAttendedPage />} />
              <Route path="broadcasts" element={<BroadcastsPage />} />
              <Route path="sms" element={<SMSDashboardPage />} />
              <Route path="sms/send" element={<SendSMSPage />} />
              <Route path="spiritual-journey" element={<SpiritualJourneyPage />} />
              <Route path="admins" element={<AdminsPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="billing/callback" element={<BillingCallbackPage />} />
              <Route path="settings" element={<SettingsPage />} />
              
              {/* Visitor Management Routes */}
              <Route path="visitors" element={<VisitorsPage />} />
              <Route path="visitors/new" element={<RegisterVisitorPage />} />
              <Route path="visitors/:visitorId" element={<VisitorDetailsPage />} />
              <Route path="visitors/:visitorId/edit" element={<EditVisitorPage />} />
              <Route path="visitors/:visitorId/followup" element={<AddFollowupPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
