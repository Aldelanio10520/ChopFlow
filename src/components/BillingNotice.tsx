import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PixQr } from "@/components/PixQr";
import { brl, dateBR } from "@/lib/format";
import type { SessionInfo } from "@/hooks/useAuth";

export function BillingNotice({ session }: { session: SessionInfo }) {
  const company = session.company;

  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*").maybeSingle();
      return data;
    },
  });

  if (!company) return null;

  const due = new Date(`${company.next_due_date}T12:00:00`);
  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
  const overdue = days < 0;
  const soon = days >= 0 && days <= 7;
  if (!overdue && !soon && company.status === "ativa") return null;

  const blocked = company.status === "bloqueada";

  return (
    <div
      className={`mb-4 rounded-xl border p-4 ${
        overdue || blocked ? "border-destructive/60 bg-destructive/10" : "border-warning/60 bg-warning/10"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <AlertTriangle className={`mt-0.5 h-5 w-5 ${overdue || blocked ? "text-destructive" : "text-warning"}`} />
          <div>
            <p className="font-semibold">
              {blocked
                ? "Acesso bloqueado por falta de pagamento"
                : overdue
                  ? `Mensalidade vencida há ${Math.abs(days)} dia(s)`
                  : `Mensalidade vence em ${days} dia(s)`}
            </p>
            <p className="text-sm text-muted-foreground">
              Vencimento {dateBR(company.next_due_date)} · {brl(Number(company.monthly_fee))}
            </p>
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <QrCode className="mr-2 h-4 w-4" /> Pagar com PIX
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pagamento da mensalidade</DialogTitle>
            </DialogHeader>
            <PixQr
              pixKey={settings?.pix_key ?? "02520340312"}
              name={settings?.pix_name ?? "ChopFlow"}
              city={settings?.pix_city ?? "Sao Paulo"}
              amount={Number(company.monthly_fee)}
              description={`Mensalidade ${company.name}`}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
