export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export const dateBR = (value?: string | null) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";

export const dateTimeBR = (value?: string | null) =>
  value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export const minutesLabel = (min?: number | null) => {
  if (min === null || min === undefined) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDaysISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  recebido: "Recebido",
  em_deslocamento: "Em deslocamento",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
};

export const KIND_LABEL: Record<string, string> = {
  emergencial: "Emergencial",
  preventiva: "Preventiva",
  sanitizacao: "Sanitização",
  instalacao: "Instalação",
};
