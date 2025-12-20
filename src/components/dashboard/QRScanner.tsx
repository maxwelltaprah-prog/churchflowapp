import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

interface QRScannerProps {
  onScan: (code: string) => void;
  isActive: boolean;
  onStop: () => void;
}

export function QRScanner({ onScan, isActive, onStop }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const isStartingRef = useRef(false);

  const startScanner = useCallback(async () => {
    if (isStartingRef.current || scannerRef.current) return;
    
    isStartingRef.current = true;
    
    try {
      setError(null);
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          const now = Date.now();
          // Debounce: prevent scanning same code within 3 seconds
          if (
            decodedText === lastScannedRef.current &&
            now - lastScanTimeRef.current < 3000
          ) {
            return;
          }
          
          lastScannedRef.current = decodedText;
          lastScanTimeRef.current = now;
          onScan(decodedText);
        },
        () => {} // Ignore scan errors
      );
    } catch (err: any) {
      setError(err.message || "Failed to start camera");
      onStop();
    } finally {
      isStartingRef.current = false;
    }
  }, [onScan, onStop]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }
    lastScannedRef.current = "";
    lastScanTimeRef.current = 0;
  }, []);

  useEffect(() => {
    if (isActive) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isActive, startScanner, stopScanner]);

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
      <div 
        id="qr-reader" 
        className="w-full max-w-md mx-auto rounded-lg overflow-hidden bg-black"
        style={{ minHeight: "300px" }}
      />
      {isActive && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Point camera at member QR codes • Scanning continuously
          </p>
          <Button variant="outline" onClick={onStop}>
            Stop Scanning
          </Button>
        </div>
      )}
    </div>
  );
}
