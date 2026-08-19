import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { buildPixPayload } from "@/lib/pix";

type Props = {
  pixKey: string;
  name?: string;
  city?: string;
  amount?: number;
  description?: string;
};

export function PixQr({ pixKey, name = "ChopFlow", city = "Sao Paulo", amount, description }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const payload = buildPixPayload({
    key: pixKey,
    name,
    city,
    ...(amount !== undefined ? { amount } : {}),
    ...(description !== undefined ? { description } : {}),
  });

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(payload, { margin: 1, width: 260, color: { dark: "#161719", light: "#ffffff" } })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(null));
    return () => {
      active = false;
    };
  }, [payload]);

  return (
    <div className="flex flex-col items-center gap-3">
      {src ? (
        <img src={src} alt="QR Code PIX para pagamento" width={220} height={220} className="rounded-lg" />
      ) : (
        <div className="h-[220px] w-[220px] animate-pulse rounded-lg bg-muted" />
      )}
      <p className="max-w-full break-all rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
        {payload}
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          navigator.clipboard.writeText(payload);
          toast.success("Código PIX copiado");
        }}
      >
        <Copy className="mr-2 h-4 w-4" /> Copiar código PIX
      </Button>
    </div>
  );
}
