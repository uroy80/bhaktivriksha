import type { Prisma, Role, UserStatus } from "@prisma/client";

/**
 * Shared filter parsing + where-clause building for the admin devotee
 * directory: used by the directory page, the JSON list API and the CSV export
 * so all three honor exactly the same query-string filters.
 */

const ROLES: Role[] = ["ADMIN", "MISSIONARY", "DEVOTEE"];
const STATUSES: UserStatus[] = ["PENDING", "ACTIVE", "INACTIVE"];

export type DevoteeFilters = {
  q?: string;
  role?: Role;
  status?: UserStatus;
  levelId?: string;
};

type SearchParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(sp: SearchParamsLike, key: string): string | undefined {
  if (sp instanceof URLSearchParams) {
    const v = sp.get(key);
    return v === null ? undefined : v;
  }
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Parse q / role / status / levelId from a query string, dropping invalid values. */
export function parseDevoteeFilters(sp: SearchParamsLike): DevoteeFilters {
  const filters: DevoteeFilters = {};
  const q = readParam(sp, "q")?.trim();
  if (q) filters.q = q;
  const role = readParam(sp, "role");
  if (role && (ROLES as string[]).includes(role)) filters.role = role as Role;
  const status = readParam(sp, "status");
  if (status && (STATUSES as string[]).includes(status)) filters.status = status as UserStatus;
  const levelId = readParam(sp, "levelId")?.trim();
  if (levelId) filters.levelId = levelId;
  return filters;
}

/** Prisma where clause for the parsed filters. */
export function devoteeWhere(f: DevoteeFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (f.q) {
    where.OR = [
      { name: { contains: f.q, mode: "insensitive" } },
      { email: { contains: f.q, mode: "insensitive" } },
      { phone: { contains: f.q } },
    ];
  }
  if (f.role) where.role = f.role;
  if (f.status) where.status = f.status;
  if (f.levelId) where.sadhanaLevelId = f.levelId;
  return where;
}

/** Rebuild the query string for links (CSV export) that must honor the same filters. */
export function filtersToQueryString(f: DevoteeFilters): string {
  const qs = new URLSearchParams();
  if (f.q) qs.set("q", f.q);
  if (f.role) qs.set("role", f.role);
  if (f.status) qs.set("status", f.status);
  if (f.levelId) qs.set("levelId", f.levelId);
  const s = qs.toString();
  return s ? `?${s}` : "";
}
