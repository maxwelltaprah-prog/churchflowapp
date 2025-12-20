import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, Maximize2 } from "lucide-react";
import { format } from "date-fns";

interface ServiceQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    id: string;
    name: string;
    service_date: string;
    start_time?: string | null;
    branches?: { name: string } | null;
  } | null;
}

export function ServiceQRDialog({ open, onOpenChange, service }: ServiceQRDialogProps) {
  if (!service) return null;

  const selfCheckinUrl = `${window.location.origin}/self-checkin/${service.id}`;

  const handleDownload = () => {
    const svg = document.querySelector("#service-qr-code svg") as SVGElement;
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    canvas.width = 800;
    canvas.height = 800;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 800, 800);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `service-qr-${service.name.replace(/\s+/g, "-")}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svg = document.querySelector("#service-qr-code svg") as SVGElement;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Service Check-in QR - ${service.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 40px;
              text-align: center;
            }
            .title {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .subtitle {
              font-size: 20px;
              color: #666;
              margin-bottom: 32px;
            }
            .qr-container {
              padding: 24px;
              border: 3px solid #000;
              border-radius: 16px;
              margin-bottom: 24px;
            }
            .qr-container svg {
              width: 300px;
              height: 300px;
            }
            .instructions {
              font-size: 18px;
              color: #333;
              max-width: 400px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="title">${service.name}</div>
          <div class="subtitle">
            ${format(new Date(service.service_date), "EEEE, MMMM d, yyyy")}
            ${service.start_time ? ` • ${service.start_time}` : ""}
          </div>
          <div class="qr-container">
            ${svgData}
          </div>
          <p class="instructions">
            Scan this QR code with your phone camera to check in for today's service
          </p>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleFullscreen = () => {
    const fullscreenWindow = window.open("", "_blank");
    if (!fullscreenWindow) return;

    const svg = document.querySelector("#service-qr-code svg") as SVGElement;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    fullscreenWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Scan to Check In - ${service.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px;
              text-align: center;
            }
            .title {
              font-size: 48px;
              font-weight: bold;
              margin-bottom: 8px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .subtitle {
              font-size: 28px;
              opacity: 0.9;
              margin-bottom: 48px;
            }
            .qr-container {
              background: white;
              padding: 32px;
              border-radius: 24px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              margin-bottom: 48px;
            }
            .qr-container svg {
              width: 400px;
              height: 400px;
            }
            .instructions {
              font-size: 24px;
              opacity: 0.95;
              max-width: 600px;
            }
            .footer {
              position: fixed;
              bottom: 20px;
              font-size: 14px;
              opacity: 0.7;
            }
          </style>
        </head>
        <body>
          <div class="title">Scan to Check In</div>
          <div class="subtitle">
            ${service.name}<br/>
            ${format(new Date(service.service_date), "EEEE, MMMM d, yyyy")}
            ${service.start_time ? ` • ${service.start_time}` : ""}
          </div>
          <div class="qr-container">
            ${svgData}
          </div>
          <p class="instructions">
            Open your phone's camera and point it at this QR code to check in
          </p>
          <div class="footer">Press F11 for fullscreen • Press Escape to exit</div>
        </body>
      </html>
    `);
    fullscreenWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Service Check-in QR Code</DialogTitle>
          <DialogDescription>
            Display this QR code for members to scan and self check-in
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg">{service.name}</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(service.service_date), "EEEE, MMMM d, yyyy")}
              {service.start_time && ` at ${service.start_time}`}
            </p>
            {service.branches?.name && (
              <p className="text-xs text-muted-foreground">{service.branches.name}</p>
            )}
          </div>

          <div 
            id="service-qr-code"
            className="flex justify-center p-6 bg-white rounded-xl border"
          >
            <QRCodeSVG
              value={selfCheckinUrl}
              size={200}
              level="H"
              includeMargin
            />
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Members scan this code to check themselves in
          </p>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button className="flex-1" onClick={handleFullscreen}>
              <Maximize2 className="w-4 h-4 mr-2" />
              Display
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
