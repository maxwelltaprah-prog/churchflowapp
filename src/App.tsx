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
import MemberPortal from "./pages/MemberPortal";
import SelfCheckin from "./pages/SelfCheckin";

// Dashboard imports
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import MembersPage from "./pages/dashboard/MembersPage";
import GroupsPage from "./pages/dashboard/GroupsPage";
import BranchesPage from "./pages/dashboard/BranchesPage";
import CheckinPage from "./pages/dashboard/CheckinPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import ServicesPage from "./pages/dashboard/ServicesPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import AttendanceOverviewPage from "./pages/dashboard/analytics/AttendanceOverviewPage";
import BroadcastsPage from "./pages/dashboard/BroadcastsPage";
import AdminsPage from "./pages/dashboard/AdminsPage";

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
            <Route path="/member/login" element={<MemberLogin />} />
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
              <Route path="groups" element={<GroupsPage />} />
              <Route path="branches" element={<BranchesPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="checkin" element={<CheckinPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="analytics/attendance" element={<AttendanceOverviewPage />} />
              <Route path="broadcasts" element={<BroadcastsPage />} />
              <Route path="admins" element={<AdminsPage />} />
              <Route path="settings" element={<SettingsPage />} />
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
