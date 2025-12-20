import { useState } from "react";
import { QrCode, Camera, CheckCircle2, XCircle, Search, Users, Loader2, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useServices, useAttendance, useBranches } from "@/hooks/useChurchData";
import { useRecordAttendance, useFindMember } from "@/hooks/useChurchMutations";
import { QRScanner } from "@/components/dashboard/QRScanner";
import { ServiceQRDialog } from "@/components/dashboard/ServiceQRDialog";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function CheckinPage() {
  const [selectedService, setSelectedService] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showServiceQR, setShowServiceQR] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<{ name: string; status: "success" | "error"; message?: string } | null>(null);

  const { data: branches } = useBranches();
  const { data: services, isLoading: servicesLoading } = useServices();
  const { data: attendance, isLoading: attendanceLoading } = useAttendance(selectedService || undefined);
  
  const recordAttendance = useRecordAttendance();
  const findMember = useFindMember();

  const selectedServiceData = services?.find(s => s.id === selectedService);

  const handleCheckin = async (codeOrToken: string) => {
    if (!selectedService || !selectedServiceData) {
      toast.error("Please select a service first");
      return;
    }

    try {
      // Find member by code or QR token
      const member = await findMember.mutateAsync(codeOrToken);

      // Record attendance
      await recordAttendance.mutateAsync({
        service_id: selectedService,
        member_id: member.id,
        branch_id: selectedServiceData.branch_id,
        member_home_branch_id: member.branch_id,
        checkin_method: isScanning ? "staff_scan" : "staff_scan",
      });

      setLastCheckin({ name: member.full_name, status: "success" });
      toast.success(`${member.full_name} checked in successfully`);
    } catch (error: any) {
      setLastCheckin({ 
        name: codeOrToken, 
        status: "error", 
        message: error.message 
      });
    }

    setManualCode("");
    setTimeout(() => setLastCheckin(null), 4000);
  };

  const handleManualCheckin = () => {
    if (manualCode.trim()) {
      handleCheckin(manualCode.trim());
    }
  };

  const handleQRScan = (code: string) => {
    handleCheckin(code);
    setIsScanning(false);
  };

  const checkedInCount = attendance?.length || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Check-in</h1>
          <p className="text-muted-foreground mt-1">
            Scan member QR codes or enter codes manually
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowServiceQR(true)}
            disabled={!selectedService}
          >
            <Monitor className="w-4 h-4 mr-2" />
            Self Check-in QR
          </Button>
          <Select value={selectedService} onValueChange={setSelectedService}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {servicesLoading ? (
              <div className="p-4 text-center">
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              </div>
            ) : services?.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No services scheduled
              </div>
            ) : (
              services?.map((service) => {
                const branch = branches?.find(b => b.id === service.branch_id);
                return (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex flex-col">
                      <span>{service.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(service.service_date), "EEE, MMM d")}
                        {service.start_time && ` at ${service.start_time}`}
                        {branch && ` · ${branch.name}`}
                      </span>
                    </div>
                  </SelectItem>
                );
              })
            )}
          </SelectContent>
        </Select>
        </div>
      </div>

      {/* Service QR Dialog */}
      <ServiceQRDialog
        open={showServiceQR}
        onOpenChange={setShowServiceQR}
        service={selectedServiceData ? {
          ...selectedServiceData,
          branches: selectedServiceData.branches as { name: string } | null
        } : null}
      />

      {/* Check-in feedback */}
      {lastCheckin && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-fade-in ${
          lastCheckin.status === "success" 
            ? "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800" 
            : "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
        }`}>
          {lastCheckin.status === "success" ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : (
            <XCircle className="w-6 h-6 text-red-600" />
          )}
          <div>
            <p className={`font-medium ${lastCheckin.status === "success" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
              {lastCheckin.status === "success" ? "Check-in successful!" : "Check-in failed"}
            </p>
            <p className="text-sm text-muted-foreground">
              {lastCheckin.status === "success" ? lastCheckin.name : lastCheckin.message}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* QR Scanner Card */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              QR Scanner
            </CardTitle>
            <CardDescription>
              Point the camera at a member's QR code to check them in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Scanner Area */}
              {isScanning ? (
                <QRScanner
                  isActive={isScanning}
                  onScan={handleQRScan}
                  onStop={() => setIsScanning(false)}
                />
              ) : (
                <div className="aspect-square max-w-md mx-auto bg-secondary/50 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                      <QrCode className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Ready to scan</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click below to activate the camera
                      </p>
                    </div>
                    <Button 
                      size="lg" 
                      onClick={() => setIsScanning(true)}
                      disabled={!selectedService}
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Start Scanning
                    </Button>
                    {!selectedService && (
                      <p className="text-xs text-amber-600">Please select a service first</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-accent" />
              Manual Entry
            </CardTitle>
            <CardDescription>
              Enter a member code if scanning doesn't work
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Enter member code (e.g., CHU-12345)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleManualCheckin()}
                className="font-mono"
              />
              <Button 
                onClick={handleManualCheckin}
                disabled={!manualCode.trim() || !selectedService || findMember.isPending}
              >
                {findMember.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check In"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Service Check-ins
            </CardTitle>
            <CardDescription>
              {selectedServiceData?.name || "Select a service"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-secondary/50 rounded-xl">
                <p className="text-3xl font-bold text-primary">{checkedInCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Checked In</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-xl">
                <p className="text-3xl font-bold text-foreground">
                  {selectedServiceData 
                    ? format(new Date(selectedServiceData.service_date), "MMM d")
                    : "—"
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">Service Date</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Check-ins */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Check-ins</CardTitle>
          <CardDescription>Members who checked in for this service</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !selectedService ? (
            <p className="text-muted-foreground text-center py-8">
              Select a service to view check-ins
            </p>
          ) : attendance?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No check-ins yet for this service
            </p>
          ) : (
            <div className="space-y-3">
              {attendance?.slice(0, 10).map((checkin: any) => (
                <div 
                  key={checkin.id} 
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {checkin.members?.full_name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{checkin.members?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{checkin.members?.member_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Checked In
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(checkin.checked_in_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
