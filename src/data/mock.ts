import type { BillSummary, BillDetail } from "./schema.js";

/**
 * Built-in SAMPLE data so the server + MCP run with zero secrets (local dev,
 * demos, CI, portfolio walkthroughs). These are illustrative, NOT the real
 * corpus — the live data (~4,900 measures) comes from the Neon `bills` table
 * when DATABASE_URL is set. Values here are fabricated placeholders.
 */
export const MOCK_BILLS: BillDetail[] = [
  {
    identifier: "PC 456",
    chamber: "lower",
    status: "aprobada",
    title: "Para crear el Registro de Transparencia de Contratos Gubernamentales.",
    topics: ["transparencia", "contratacion-publica"],
    latest_action_date: "2026-05-14",
    session: "2025-2028",
    classification: ["bill"],
    abstract:
      "Ordena a las agencias publicar todo contrato sobre $25,000 en un registro central de acceso abierto, con datos estructurados y actualizacion mensual.",
    subjects: ["Government Operations", "Transparency"],
    sponsors: [
      { name: "Rodriguez Vega, Ana", is_primary: true, classification: "primary" },
      { name: "Colon Diaz, Luis", is_primary: false, classification: "cosponsor" },
    ],
    actions: [
      { date: "2026-02-03", description: "Radicado y referido a Comision de Gobierno.", classification: ["introduction", "referral-committee"] },
      { date: "2026-05-14", description: "Aprobado por la Camara.", classification: ["passage"] },
    ],
    sutra_url: "https://sutra.oslpr.org/",
  },
  {
    identifier: "PS 123",
    chamber: "upper",
    status: "ley",
    title: "Ley para el Acceso Abierto a Datos de la Asamblea Legislativa.",
    topics: ["datos-abiertos", "tecnologia"],
    latest_action_date: "2026-06-01",
    session: "2025-2028",
    classification: ["bill"],
    abstract:
      "Requiere que la Asamblea Legislativa publique medidas, votaciones e historial en formatos legibles por maquina bajo licencia abierta.",
    subjects: ["Technology", "Open Government"],
    sponsors: [{ name: "Marrero Santos, Carmen", is_primary: true, classification: "primary" }],
    actions: [
      { date: "2026-01-15", description: "Radicado.", classification: ["introduction"] },
      { date: "2026-06-01", description: "Convertido en Ley Num. 12-2026.", classification: ["became-law"] },
    ],
    sutra_url: "https://sutra.oslpr.org/",
  },
  {
    identifier: "PC 789",
    chamber: "lower",
    status: "radicada",
    title: "Para incentivar la instalacion de energia solar en residencias.",
    topics: ["energia", "ambiente"],
    latest_action_date: "2026-04-22",
    session: "2025-2028",
    classification: ["bill"],
    abstract: "Establece un credito contributivo para sistemas solares residenciales certificados.",
    subjects: ["Energy", "Environment"],
    sponsors: [{ name: "Torres Ramos, Hector", is_primary: true, classification: "primary" }],
    actions: [{ date: "2026-04-22", description: "Radicado y referido a Comision de Energia.", classification: ["introduction", "referral-committee"] }],
    sutra_url: "https://sutra.oslpr.org/",
  },
];

const toSummary = (b: BillDetail): BillSummary => ({
  identifier: b.identifier,
  chamber: b.chamber,
  status: b.status,
  title: b.title,
  topics: b.topics,
  latest_action_date: b.latest_action_date,
});

export function mockSearch(
  params: { q?: string; chamber?: string; status?: string },
  limit: number,
): BillSummary[] {
  const q = params.q?.toLowerCase();
  return MOCK_BILLS.filter((b) => {
    if (q && !(`${b.title} ${b.identifier}`.toLowerCase().includes(q))) return false;
    if (params.chamber && b.chamber !== params.chamber) return false;
    if (params.status && b.status !== params.status) return false;
    return true;
  })
    .slice(0, limit)
    .map(toSummary);
}

export function mockGet(identifier: string): BillDetail | null {
  const norm = identifier.replace(/-/g, " ").toUpperCase();
  return MOCK_BILLS.find((b) => b.identifier.toUpperCase() === norm) ?? null;
}
