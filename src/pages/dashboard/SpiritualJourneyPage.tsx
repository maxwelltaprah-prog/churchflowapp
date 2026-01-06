import { useState } from "react";
import { Plus, Edit2, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { useSpiritualJourneys, type SpiritualJourney } from "@/hooks/useSpiritualJourneyData";
import { useDeleteSpiritualJourney } from "@/hooks/useSpiritualJourneyMutations";
import { AddSpiritualJourneyDialog } from "@/components/dashboard/AddSpiritualJourneyDialog";
import { EditSpiritualJourneyDialog } from "@/components/dashboard/EditSpiritualJourneyDialog";

export default function SpiritualJourneyPage() {
  const { data: journeys, isLoading } = useSpiritualJourneys();
  const deleteJourney = useDeleteSpiritualJourney();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<SpiritualJourney | null>(null);

  const handleEdit = (journey: SpiritualJourney) => {
    setSelectedJourney(journey);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (journey: SpiritualJourney) => {
    setSelectedJourney(journey);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedJourney) {
      await deleteJourney.mutateAsync(selectedJourney.id);
      setDeleteDialogOpen(false);
      setSelectedJourney(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Spiritual Journey</h1>
          <p className="text-muted-foreground">
            Manage spiritual milestones that members can select
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Option
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardDescription>Total Options</CardDescription>
            <CardTitle className="text-3xl">{journeys?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Spiritual milestones</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl">{journeys?.filter(j => j.is_active).length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Available for selection</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-3xl">{journeys?.filter(j => !j.is_active).length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Hidden from members</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            Journey Options
          </CardTitle>
          <CardDescription>
            Define the spiritual milestones available for member selection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!journeys || journeys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No spiritual journey options yet</p>
              <p className="text-sm">Add your first milestone to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journeys.map((journey) => (
                  <TableRow key={journey.id}>
                    <TableCell className="font-medium">{journey.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {journey.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={journey.is_active ? "default" : "secondary"}
                        className={journey.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : ""}
                      >
                        {journey.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(journey)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(journey)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddSpiritualJourneyDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      
      <EditSpiritualJourneyDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        journey={selectedJourney}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Spiritual Journey Option</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedJourney?.name}"? This will also remove it
              from all members who have selected it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
