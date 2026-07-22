import { neon } from "@neondatabase/serverless";
import { clampLimit, type BillSummary, type BillDetail } from "./schema.js";
import { mockSearch, mockGet } from "./mock.js";

/**
 * Read-only data access over the CivicaPR `bills` corpus (Neon Postgres).
 * Mirrors the live app's query shape (src/lib/legislation/queries.ts) but
 * exposes only SELECTs. When DATABASE_URL is unset we fall back to sample
 * data so the whole stack runs with no secrets.
 *
 * SECURITY: point DATABASE_URL at a role granted SELECT only. This module
 * never issues writes; keeping the role read-only is defense in depth.
 */
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export const usingLiveData = sql !== null;

export async function searchBills(params: {
  q?: string;
  chamber?: string;
  status?: string;
  limit?: number;
}): Promise<BillSummary[]> {
  const limit = clampLimit(params.limit);
  if (!sql) return mockSearch(params, limit);

  const q = params.q?.trim() || null;
  const chamber = params.chamber?.trim() || null;
  const status = params.status?.trim() || null;

  const rows = await sql`
    select identifier, chamber, status, title,
           coalesce(topics, '{}') as topics,
           to_char(latest_action_date, 'YYYY-MM-DD') as latest_action_date
      from bills
     where (${q}::text is null or title ilike '%' || ${q} || '%' or identifier ilike '%' || ${q} || '%')
       and (${chamber}::text is null or chamber = ${chamber})
       and (${status}::text is null or status = ${status})
     order by latest_action_date desc nulls last, identifier asc
     limit ${limit}
  `;
  return rows as BillSummary[];
}

export async function getBill(identifier: string): Promise<BillDetail | null> {
  if (!sql) return mockGet(identifier);

  const norm = identifier.replace(/-/g, " ").toUpperCase();
  const rows = (await sql`
    select id, identifier, session, chamber,
           coalesce(classification, '{}') as classification,
           title, abstract,
           coalesce(subjects, '{}') as subjects,
           coalesce(topics, '{}') as topics,
           status,
           to_char(latest_action_date, 'YYYY-MM-DD') as latest_action_date
      from bills
     where upper(identifier) = ${norm}
     limit 1
  `) as any[];

  const b = rows[0];
  if (!b) return null;

  const sponsors = (await sql`
    select raw_name as name, is_primary, classification
      from bill_sponsors
     where bill_id = ${b.id}
     order by is_primary desc, ord asc
  `) as any[];

  const actions = (await sql`
    select to_char(action_date, 'YYYY-MM-DD') as date, description,
           coalesce(classification, '{}') as classification
      from bill_actions
     where bill_id = ${b.id}
     order by ord asc
  `) as any[];

  return {
    identifier: b.identifier,
    chamber: b.chamber,
    status: b.status,
    title: b.title,
    topics: b.topics ?? [],
    latest_action_date: b.latest_action_date,
    session: b.session,
    classification: Array.isArray(b.classification) ? b.classification : b.classification ? [b.classification] : [],
    abstract: b.abstract,
    subjects: b.subjects ?? [],
    sponsors: sponsors.map((s) => ({
      name: s.name,
      is_primary: !!s.is_primary,
      classification: s.classification ?? null,
    })),
    actions: actions.map((a) => ({
      date: a.date,
      description: a.description,
      classification: Array.isArray(a.classification) ? a.classification : [],
    })),
    sutra_url: "https://sutra.oslpr.org/",
  };
}

/** Free, unpaid teaser: corpus-wide counts only. Whets the appetite; leaks nothing. */
export async function corpusStats(): Promise<{ total: number; ley: number; aprobada: number; live: boolean }> {
  if (!sql) {
    const { MOCK_BILLS } = await import("./mock.js");
    return {
      total: MOCK_BILLS.length,
      ley: MOCK_BILLS.filter((b) => b.status === "ley").length,
      aprobada: MOCK_BILLS.filter((b) => b.status === "aprobada").length,
      live: false,
    };
  }
  const rows = (await sql`
    select count(*)::int as total,
           count(*) filter (where status = 'ley')::int as ley,
           count(*) filter (where status = 'aprobada')::int as aprobada
      from bills
  `) as any[];
  return { ...rows[0], live: true };
}
