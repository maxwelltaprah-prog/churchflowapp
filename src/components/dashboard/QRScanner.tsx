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

  // Keep callbacks stable to avoid stop/start loops on each re-render
  const onScanRef = useRef(onScan);
  const onStopRef = useRef(onStop);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);
  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

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
          fps: 12,
          qrbox: { width: 260, height: 260 },
        },
        (decodedText) => {
          const now = Date.now();
          // Debounce duplicates (same QR being read repeatedly)
          if (
            decodedText === lastScannedRef.current &&
            now - lastScanTimeRef.current < 2500
          ) {
            return;
          }
          lastScannedRef.current = decodedText;
          lastScanTimeRef.current = now;
          onScanRef.current(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      setError(err?.message || "Failed to start camera");
      onStopRef.current();
    } finally {
      isStartingRef.current = false;
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return;

    try {
      await scannerRef.current.stop();
    } catch {
      // ignore
    }

    try {
      scannerRef.current.clear();
    } catch {
      // ignore
    }

    scannerRef.current = null;
    lastScannedRef.current = "";
    lastScanTimeRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isActive) {
      stopScanner();
      return;
    }

    startScanner();

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
        style={{ minHeight: "320px" }}
      />
      {isActive && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Scanning continuously — keep scanning more QR codes
          </p>
          <Button variant="outline" onClick={onStop}>
            Stop Scanning
          </Button>
        </div>
      )}
    </div>
  );
}
