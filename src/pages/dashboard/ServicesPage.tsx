import { useState } from "react";
import { Plus, MoreHorizontal, Calendar, Clock, MapPin, Loader2, Edit, Trash2, FileText, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useServices, useBranches } from "@/hooks/useChurchData";
import { useDeactivateService } from "@/hooks/useChurchMutations";
import { AddServiceDialog } from "@/components/dashboard/AddServiceDialog";
import { EditServiceDialog } from "@/components/dashboard/EditServiceDialog";
import { format, isToday, isTomorrow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

// Hook to fetch all service uploads for display
function useAllServiceUploads(serviceIds: string[]) {
  return useQuery({
    queryKey: ["all-service-uploads", serviceIds],
    queryFn: async () => {
      if (serviceIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from("service_uploads")
        .select("service_id, upload_type")
        .in("service_id", serviceIds)
        .eq("is_expired", false)
        .gt("expires_at", new Date().toISOString());

      if (error) throw error;

      // Group by service_id
      const uploadMap: Record<string, { hasProgram: boolean; hasSermon: boolean }> = {};
      data?.forEach(upload => {
        if (!uploadMap[upload.service_id]) {
          uploadMap[upload.service_id] = { hasProgram: false, hasSermon: false };
        }
        if (upload.upload_type === "program") {
          uploadMap[upload.service_id].hasProgram = true;
        } else if (upload.upload_type === "sermon_audio") {
          uploadMap[upload.service_id].hasSermon = true;
        }
      });

      return uploadMap;
    },
    enabled: serviceIds.length > 0,
  });
}

export default function ServicesPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<Tables<"services"> | null>(null);
  const { data: services, isLoading } = useServices();
  const { data: branches } = useBranches();
  const deactivateService = useDeactivateService();

  // Fetch upload status for all services
  const serviceIds = services?.map(s => s.id) || [];
  const { data: uploadStatus } = useAllServiceUploads(serviceIds);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, MMM d");
  };

  const getStatusBadge = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Tomorrow</Badge>;
    }
    return <Badge variant="secondary">Upcoming</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground mt-1">
            Schedule and manage church services
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Service
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming Services</CardDescription>
            <CardTitle className="text-3xl">{services?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Scheduled services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today's Services</CardDescription>
            <CardTitle className="text-3xl">
              {services?.filter(s => isToday(new Date(s.service_date))).length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Active today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>This Week</CardDescription>
            <CardTitle className="text-3xl">
              {services?.filter(s => {
                const date = new Date(s.service_date);
                const now = new Date();
                const weekEnd = new Date(now);
                weekEnd.setDate(now.getDate() + 7);
                return date >= now && date <= weekEnd;
              }).length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Services</CardTitle>
          <CardDescription>All upcoming services across branches</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : services?.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No services scheduled</p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first service
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Time</TableHead>
                  <TableHead className="hidden sm:table-cell">Branch</TableHead>
                  <TableHead>Uploads</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services?.map((service) => {
                  const branch = branches?.find(b => b.id === service.branch_id);
                  const uploads = uploadStatus?.[service.id];
                  
                  return (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">{service.name}</div>
                          {service.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {service.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{getDateLabel(service.service_date)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {service.start_time ? (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {service.start_time}
                              {service.end_time && ` - ${service.end_time}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{branch?.name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex items-center gap-1">
                            {uploads?.hasProgram ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="p-1.5 rounded bg-primary/10">
                                    <FileText className="w-4 h-4 text-primary" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Program uploaded</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="p-1.5 rounded bg-muted">
                                <FileText className="w-4 h-4 text-muted-foreground/50" />
                              </div>
                            )}
                            {uploads?.hasSermon ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="p-1.5 rounded bg-primary/10">
                                    <Music className="w-4 h-4 text-primary" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Sermon audio uploaded</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="p-1.5 rounded bg-muted">
                                <Music className="w-4 h-4 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(service.service_date)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedService(service);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Service
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive cursor-pointer"
                              onClick={() => {
                                setSelectedService(service);
                                setShowCancelDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Cancel Service
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddServiceDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <EditServiceDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog} 
        service={selectedService} 
      />

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel "{selectedService?.name}"? This will mark the service as inactive and it won't appear in upcoming services.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Service</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedService) {
                  deactivateService.mutate(selectedService.id);
                }
              }}
            >
              Cancel Service
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
