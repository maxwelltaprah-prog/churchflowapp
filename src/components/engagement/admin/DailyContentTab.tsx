import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, Eye, EyeOff, Sun, BookOpen, Megaphone, Heart, Sparkles } from "lucide-react";
import { format } from "date-fns";
import {
  useAdminDailyContent,
  useDeleteDailyContent,
  useUpdateDailyContent,
} from "@/hooks/useAdminEngagementData";
import { DailyContent } from "@/hooks/useEngagementData";
import { AddDailyContentDialog } from "./AddDailyContentDialog";

const contentTypeConfig: Record<
  DailyContent["content_type"],
  { icon: typeof Sun; label: string; color: string }
> = {
  devotional: { icon: BookOpen, label: "Devotional", color: "bg-kpi-purple/15 text-kpi-purple" },
  announcement: { icon: Megaphone, label: "Announcement", color: "bg-kpi-blue/15 text-kpi-blue" },
  encouragement: { icon: Heart, label: "Encouragement", color: "bg-kpi-rose/15 text-kpi-rose" },
  scripture: { icon: Sparkles, label: "Scripture", color: "bg-kpi-amber/15 text-kpi-amber" },
};

export function DailyContentTab() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingContent, setEditingContent] = useState<DailyContent | null>(null);
  
  const { data: content, isLoading } = useAdminDailyContent();
  const deleteContent = useDeleteDailyContent();
  const updateContent = useUpdateDailyContent();

  const handleTogglePublish = (item: DailyContent) => {
    updateContent.mutate({ id: item.id, is_published: !item.is_published });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this content?")) {
      deleteContent.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Today at Church</CardTitle>
              <CardDescription>
                Create daily devotionals, announcements, and encouragements for members
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Content
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!content || content.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sun className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No content yet</p>
              <p className="text-sm">Create your first daily content to engage members</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Publish Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.map((item) => {
                  const config = contentTypeConfig[item.content_type];
                  const Icon = config.icon;
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {item.content.substring(0, 60)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={config.color}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.publish_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_published ? "default" : "outline"}>
                          {item.is_published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingContent(item)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTogglePublish(item)}>
                              {item.is_published ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Unpublish
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Publish
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(item.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
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

      <AddDailyContentDialog
        open={showAddDialog || !!editingContent}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingContent(null);
          }
        }}
        editingContent={editingContent}
      />
    </>
  );
}
