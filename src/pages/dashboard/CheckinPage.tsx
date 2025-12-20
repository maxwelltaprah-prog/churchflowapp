import { useState } from "react";
import { QrCode, Camera, CheckCircle2, XCircle, Search, Users } from "lucide-react";
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

// Mock data for recent check-ins
const recentCheckins = [
  { id: 1, name: "Sarah Johnson", time: "2 min ago", branch: "Main Branch", status: "success" },
  { id: 2, name: "Michael Owusu", time: "5 min ago", branch: "Main Branch", status: "success" },
  { id: 3, name: "Grace Adu", time: "8 min ago", branch: "Main Branch", status: "success" },
  { id: 4, name: "James Mensah", time: "12 min ago", branch: "Main Branch", status: "success" },
  { id: 5, name: "Abena Serwaa", time: "15 min ago", branch: "Main Branch", status: "success" },
];

const services = [
  { id: "1", name: "Sunday Service", date: "Today, 9:00 AM" },
  { id: "2", name: "Midweek Prayer", date: "Wed, 6:00 PM" },
  { id: "3", name: "Youth Service", date: "Fri, 5:00 PM" },
];

export default function CheckinPage() {
  const [selectedService, setSelectedService] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<{ name: string; status: "success" | "error" } | null>(null);

  const handleManualCheckin = () => {
    if (manualCode.trim()) {
      // Simulate check-in
      setLastCheckin({ name: "John Doe", status: "success" });
      setManualCode("");
      setTimeout(() => setLastCheckin(null), 3000);
    }
  };

  const startScanning = () => {
    setIsScanning(true);
    // This would integrate with a QR scanner library
  };

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
        <Select value={selectedService} onValueChange={setSelectedService}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                <div className="flex flex-col">
                  <span>{service.name}</span>
                  <span className="text-xs text-muted-foreground">{service.date}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
            <p className="text-sm text-muted-foreground">{lastCheckin.name}</p>
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
              <div className="aspect-square max-w-md mx-auto bg-secondary/50 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center">
                {isScanning ? (
                  <div className="text-center space-y-4">
                    <div className="w-48 h-48 border-4 border-primary rounded-2xl relative">
                      <div className="absolute inset-4 border-2 border-primary/50 rounded-lg animate-pulse" />
                      <div className="absolute top-0 left-0 right-0 h-1 bg-primary animate-[scan_2s_linear_infinite]" />
                    </div>
                    <p className="text-sm text-muted-foreground">Scanning...</p>
                    <Button variant="outline" onClick={() => setIsScanning(false)}>
                      Stop Scanning
                    </Button>
                  </div>
                ) : (
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
                      variant="hero" 
                      size="lg" 
                      onClick={startScanning}
                      disabled={!selectedService}
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Start Scanning
                    </Button>
                    {!selectedService && (
                      <p className="text-xs text-amber-600">Please select a service first</p>
                    )}
                  </div>
                )}
              </div>
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
                placeholder="Enter member code (e.g., GCC-12345)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <Button 
                onClick={handleManualCheckin}
                disabled={!manualCode.trim() || !selectedService}
              >
                Check In
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Today's Check-ins
            </CardTitle>
            <CardDescription>
              {services.find(s => s.id === selectedService)?.name || "Select a service"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-secondary/50 rounded-xl">
                <p className="text-3xl font-bold text-primary">142</p>
                <p className="text-xs text-muted-foreground mt-1">Checked In</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-xl">
                <p className="text-3xl font-bold text-accent">450</p>
                <p className="text-xs text-muted-foreground mt-1">Expected</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-xl">
                <p className="text-3xl font-bold text-foreground">31%</p>
                <p className="text-xs text-muted-foreground mt-1">Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Check-ins */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Check-ins</CardTitle>
          <CardDescription>Members who checked in recently</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentCheckins.map((checkin) => (
              <div 
                key={checkin.id} 
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {checkin.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{checkin.name}</p>
                    <p className="text-xs text-muted-foreground">{checkin.branch}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Checked In
                  </Badge>
                  <span className="text-xs text-muted-foreground">{checkin.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
