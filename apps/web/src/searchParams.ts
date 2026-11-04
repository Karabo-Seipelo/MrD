export type SearchParams = {
  q: string;
  category: string;
  sort: "asc" | "desc";
  page: number;
};

export type ParseOptions = {
  knownCategories?: ReadonlySet<string>;
  maxPage?: number;
};

export type ParseResult = {
  params: SearchParams;
  changed: boolean;
};

const ALLOWED_PARAM_KEYS = new Set(["q", "category", "sort", "page"]);

function parsePage(raw: string | null, maxPage?: number): number {
  const pageNumber = Number(raw);
  let page =
    Number.isFinite(pageNumber) && pageNumber >= 1 ? Math.floor(pageNumber) : 1;
  if (maxPage != null && maxPage >= 1) {
    page = Math.min(page, maxPage);
  }
  return page;
}

function parseSort(raw: string | null): "asc" | "desc" {
  return raw === "desc" ? "desc" : "asc";
}

/** Page 1 is omitted from the canonical query string (see serializeSearchParams). */
function pageQueryToken(page: number): string {
  return page > 1 ? String(page) : "";
}

function parseCategory(
  raw: string | null,
  knownCategories?: ReadonlySet<string>,
): string {
  const category = (raw ?? "").trim().toLowerCase();
  if (!category) return "";
  if (
    knownCategories &&
    knownCategories.size > 0 &&
    !knownCategories.has(category)
  ) {
    return "";
  }
  return category;
}

export function parseSearchParams(
  search: string,
  options: ParseOptions = {},
): ParseResult {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  const q = (params.get("q") ?? "").trim();
  const category = parseCategory(
    params.get("category"),
    options.knownCategories,
  );
  const sort = parseSort(params.get("sort"));
  const page = parsePage(params.get("page"), options.maxPage);

  const normalized: SearchParams = { q, category, sort, page };

  const rawQParam = params.get("q") ?? "";
  const rawCategoryParam = params.get("category") ?? "";
  const rawSort = params.get("sort");
  const rawPage = params.get("page");
  const rawPageToken =
    rawPage == null ? "" : pageQueryToken(parsePage(rawPage, options.maxPage));
  const canonicalCategory = category ? category : "";
  const canonicalSortToken = sort === "desc" ? "desc" : "";

  const changed =
    [...params.keys()].some((key) => !ALLOWED_PARAM_KEYS.has(key)) ||
    rawQParam !== q ||
    rawCategoryParam !== canonicalCategory ||
    (rawSort ?? "") !== canonicalSortToken ||
    rawPageToken !== pageQueryToken(page);

  return {
    params: normalized,
    changed,
  };
}

export function serializeSearchParams(params: SearchParams): string {
  const out = new URLSearchParams();
  if (params.q) out.set("q", params.q);
  if (params.category) out.set("category", params.category);
  if (params.sort === "desc") out.set("sort", "desc");
  if (params.page > 1) out.set("page", String(params.page));
  return out.toString();
}

export function maxPageForTotal(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}
