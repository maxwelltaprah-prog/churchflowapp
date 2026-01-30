import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, Heart, BookOpen, Settings } from "lucide-react";
import { DailyContentTab } from "@/components/engagement/admin/DailyContentTab";
import { PrayerRequestsTab } from "@/components/engagement/admin/PrayerRequestsTab";
import { FollowupPlansTab } from "@/components/engagement/admin/FollowupPlansTab";
import { EngagementSettingsTab } from "@/components/engagement/admin/EngagementSettingsTab";

export default function EngagementPage() {
  const [activeTab, setActiveTab] = useState("daily-content");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member Engagement"
        description="Manage daily content, prayer wall, and sermon follow-ups"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary/50 p-1">
          <TabsTrigger value="daily-content" className="gap-2">
            <Sun className="w-4 h-4" />
            Today at Church
          </TabsTrigger>
          <TabsTrigger value="prayer-requests" className="gap-2">
            <Heart className="w-4 h-4" />
            Prayer Wall
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Sermon Follow-ups
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily-content">
          <DailyContentTab />
        </TabsContent>

        <TabsContent value="prayer-requests">
          <PrayerRequestsTab />
        </TabsContent>

        <TabsContent value="followups">
          <FollowupPlansTab />
        </TabsContent>

        <TabsContent value="settings">
          <EngagementSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
