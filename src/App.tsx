import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ChurchSignup from "./pages/ChurchSignup";
import JoinBranch from "./pages/JoinBranch";
import NotFound from "./pages/NotFound";

// Dashboard imports
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import MembersPage from "./pages/dashboard/MembersPage";
import BranchesPage from "./pages/dashboard/BranchesPage";
import CheckinPage from "./pages/dashboard/CheckinPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import { ServicesPage, AnalyticsPage, BroadcastsPage } from "./pages/dashboard/PlaceholderPages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup/church" element={<ChurchSignup />} />
          <Route path="/join" element={<JoinBranch />} />

          {/* Dashboard Routes */}
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="checkin" element={<CheckinPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="broadcasts" element={<BroadcastsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
