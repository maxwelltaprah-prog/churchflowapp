import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Link as LinkIcon, MapPin } from "lucide-react";
import { toast } from "sonner";

interface BranchQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: {
    id: string;
    name: string;
    location?: string | null;
    join_code: string;
  } | null;
}

export function BranchQRDialog({ open, onOpenChange, branch }: BranchQRDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const joinUrl = branch ? `${window.location.origin}/join?code=${branch.join_code}` : '';

  const handleCopyLink = () => {
    if (!branch) return;
    navigator.clipboard.writeText(joinUrl);
    toast.success("Join link copied to clipboard");
  };

  const handleDownload = () => {
    if (!branch) return;
    const svg = document.getElementById(`branch-qr-${branch.id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      
      const downloadLink = document.createElement("a");
      downloadLink.download = `${branch.name.replace(/\s+/g, "-")}-join-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handlePrint = () => {
    if (!branch) return;
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${branch.name} - Join QR Code</title>
          <style>
            body { 
              font-family: system-ui, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh; 
              margin: 0;
              background: #f5f5f5;
            }
            .card {
              background: white;
              border-radius: 16px;
              padding: 32px;
              text-align: center;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              width: 320px;
            }
            .name { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
            .location { color: #888; font-size: 14px; margin-bottom: 8px; }
            .code { font-family: monospace; font-size: 18px; color: #666; margin-bottom: 16px; background: #f0f0f0; padding: 8px 16px; border-radius: 8px; }
            .qr { margin: 0 auto 16px; }
            .instructions { font-size: 13px; color: #666; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="name">${branch.name}</div>
            ${branch.location ? `<div class="location">${branch.location}</div>` : ""}
            <div class="code">${branch.join_code}</div>
            <div class="qr">${document.getElementById(`branch-qr-${branch.id}`)?.outerHTML || ""}</div>
            <div class="instructions">Scan to join this branch</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {branch && (
          <>
            <DialogHeader>
              <DialogTitle>Branch Join QR Code</DialogTitle>
              <DialogDescription>
                Members can scan this code to join {branch.name}
              </DialogDescription>
            </DialogHeader>
            
            <div ref={printRef} className="flex flex-col items-center p-6 space-y-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-primary" />
              </div>
              
              <div className="text-center">
                <h3 className="font-semibold text-lg">{branch.name}</h3>
                {branch.location && (
                  <p className="text-sm text-muted-foreground">{branch.location}</p>
                )}
                <p className="text-sm font-mono mt-2 px-3 py-1.5 bg-secondary rounded-md">
                  {branch.join_code}
                </p>
              </div>
              
              <div className="p-4 bg-white rounded-xl shadow-sm border">
                <QRCodeSVG
                  id={`branch-qr-${branch.id}`}
                  value={joinUrl}
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Scan to join this branch
              </p>
            </div>

            <div className="flex gap-2 justify-center pb-4 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}