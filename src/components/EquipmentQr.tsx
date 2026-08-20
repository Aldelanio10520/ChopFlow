import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Camera, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function EquipmentQr({ token, label }: { token: string; label?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(token, { margin: 1, width: 220, color: { dark: "#161719", light: "#ffffff" } })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(null));
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="flex flex-col items-center gap-2">
      {src ? (
        <img src={src} alt={label ?? "QR do equipamento"} width={160} height={160} className="rounded-lg bg-white p-2" />
      ) : (
        <div className="h-40 w-40 animate-pulse rounded-lg bg-muted" />
      )}
      <p className="break-all text-center text-[10px] text-muted-foreground">{token}</p>
    </div>
  );
}

export function ScanEquipmentQr({
  disabled,
  onToken,
}: {
  disabled?: boolean;
  onToken: (token: string) => void;
}) {
  const [manual, setManual] = useState("");
  const [open, setOpen] = useState(false);

  const handleFile = async (file: File) => {
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => {
          detect: (source: ImageBitmap) => Promise<Array<{ rawValue?: string }>>;
        };
      }
    ).BarcodeDetector;
    if (!Detector) return;
    const detector = new Detector({ formats: ["qr_code"] });
    const bitmap = await createImageBitmap(file);
    const codes = await detector.detect(bitmap);
    const value = codes[0]?.rawValue?.trim();
    if (value) {
      onToken(value);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="w-full" disabled={disabled}>
          <Camera className="mr-1 h-4 w-4" /> Ler QR do equipamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <QrCode className="mr-2 inline h-4 w-4" />
            Identificar equipamento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Tire uma foto do QR ou cole o código se a câmera não reconhecer.
          </p>
          <Input
            placeholder="Cole o código do QR"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <Button
            className="w-full"
            disabled={!manual.trim()}
            onClick={() => {
              onToken(manual.trim());
              setOpen(false);
              setManual("");
            }}
          >
            Vincular código
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
