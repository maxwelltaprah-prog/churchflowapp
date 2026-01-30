import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TitheOverviewTab } from "@/components/tithes/TitheOverviewTab";
import { TithePaymentsTab } from "@/components/tithes/TithePaymentsTab";
import { TitheMembersTab } from "@/components/tithes/TitheMembersTab";
import { TitheAnalyticsTab } from "@/components/tithes/TitheAnalyticsTab";
import { TitheBulkSMSTab } from "@/components/tithes/TitheBulkSMSTab";
import { TitheSettingsTab } from "@/components/tithes/TitheSettingsTab";
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Settings 
} from "lucide-react";

export default function TithesPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tithe Management"
        description="Track and manage tithe payments, view analytics, and communicate with members"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk SMS</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TitheOverviewTab />
        </TabsContent>

        <TabsContent value="payments">
          <TithePaymentsTab />
        </TabsContent>

        <TabsContent value="members">
          <TitheMembersTab />
        </TabsContent>

        <TabsContent value="analytics">
          <TitheAnalyticsTab />
        </TabsContent>

        <TabsContent value="sms">
          <TitheBulkSMSTab />
        </TabsContent>

        <TabsContent value="settings">
          <TitheSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
