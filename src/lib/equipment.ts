import { supabase } from "@/integrations/supabase/client";

export type EquipmentMatch = {
  id: string;
  customer_id: string;
  serial_number: string | null;
  customers: { name: string } | null;
};

export async function findEquipmentBySerial(companyId: string, serial: string) {
  const normalized = serial.trim();
  if (!normalized) return null;
  const { data, error } = await supabase
    .from("equipments")
    .select("id, customer_id, serial_number, customers(name)")
    .eq("company_id", companyId)
    .ilike("serial_number", normalized);
  if (error) throw error;
  return (
    (data ?? []).find((eq) => (eq.serial_number ?? "").toLowerCase() === normalized.toLowerCase()) ??
    null
  );
}

export async function transferEquipment(equipmentId: string, customerId: string) {
  const { error } = await supabase.from("equipments").update({ customer_id: customerId }).eq("id", equipmentId);
  if (error) throw error;
}
