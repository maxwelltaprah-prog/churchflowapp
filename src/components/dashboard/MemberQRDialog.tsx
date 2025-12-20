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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Download, Printer } from "lucide-react";

interface MemberQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    full_name: string;
    member_code: string;
    qr_code_token: string;
    branches?: { name: string } | null;
  } | null;
}

export function MemberQRDialog({ open, onOpenChange, member }: MemberQRDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!member) return null;

  const handleDownload = () => {
    const svg = document.getElementById(`qr-${member.id}`);
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
      downloadLink.download = `${member.full_name.replace(/\s+/g, "-")}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${member.full_name} - Member Card</title>
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
              width: 300px;
            }
            .name { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
            .code { font-family: monospace; color: #666; margin-bottom: 16px; }
            .branch { color: #888; font-size: 14px; margin-bottom: 16px; }
            .qr { margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="name">${member.full_name}</div>
            <div class="code">${member.member_code}</div>
            <div class="branch">${(member.branches as any)?.name || "—"}</div>
            <div class="qr">${document.getElementById(`qr-${member.id}`)?.outerHTML || ""}</div>
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
        <DialogHeader>
          <DialogTitle>Member QR Code</DialogTitle>
          <DialogDescription>
            Scan this code to check in {member.full_name}
          </DialogDescription>
        </DialogHeader>
        
        <div ref={printRef} className="flex flex-col items-center p-6 space-y-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {member.full_name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center">
            <h3 className="font-semibold text-lg">{member.full_name}</h3>
            <p className="text-sm text-muted-foreground font-mono">{member.member_code}</p>
            {member.branches && (
              <p className="text-sm text-muted-foreground">{(member.branches as any).name}</p>
            )}
          </div>
          
          <div className="p-4 bg-white rounded-xl shadow-sm border">
            <QRCodeSVG
              id={`qr-${member.id}`}
              value={member.qr_code_token}
              size={180}
              level="H"
              includeMargin
            />
          </div>
        </div>

        <div className="flex gap-3 justify-center pb-4">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}