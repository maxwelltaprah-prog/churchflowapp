import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, XCircle } from "lucide-react";

interface QRScannerProps {
  onScan: (code: string) => void;
  isActive: boolean;
  onStop: () => void;
}

export function QRScanner({ onScan, isActive, onStop }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isActive) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isActive]);

  const startScanner = async () => {
    try {
      setError(null);
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {} // Ignore errors during scanning
      );
    } catch (err: any) {
      setError(err.message || "Failed to start camera");
      onStop();
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // Ignore errors during cleanup
      }
      scannerRef.current = null;
    }
  };

  if (error) {
    return (
      <div className="text-center space-y-4 p-8">
        <XCircle className="w-12 h-12 mx-auto text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={onStop}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div id="qr-reader" className="w-full max-w-md mx-auto rounded-lg overflow-hidden" />
      {isActive && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Point camera at QR code</p>
          <Button variant="outline" onClick={onStop}>
            Stop Scanning
          </Button>
        </div>
      )}
    </div>
  );
}
