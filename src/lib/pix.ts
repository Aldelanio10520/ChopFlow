function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function field(id: string, value: string) {
  return id + String(value.length).padStart(2, "0") + value;
}

function sanitize(value: string, max: number) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .slice(0, max)
    .trim();
}

export function buildPixPayload(opts: {
  key: string;
  name: string;
  city: string;
  amount?: number;
  description?: string;
}) {
  const merchant =
    field("00", "br.gov.bcb.pix") +
    field("01", opts.key) +
    (opts.description ? field("02", sanitize(opts.description, 40)) : "");

  let payload =
    field("00", "01") +
    field("26", merchant) +
    field("52", "0000") +
    field("53", "986") +
    (opts.amount && opts.amount > 0 ? field("54", opts.amount.toFixed(2)) : "") +
    field("58", "BR") +
    field("59", sanitize(opts.name, 25) || "RECEBEDOR") +
    field("60", sanitize(opts.city, 15) || "CIDADE") +
    field("62", field("05", "***"));

  payload += "6304";
  return payload + crc16(payload);
}
