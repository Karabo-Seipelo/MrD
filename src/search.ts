export type Product = {
  id: number;
  title: string;
  description: string;
  category: string;
  brand?: string;
  tags?: string[];
};

function searchProducts(products: Product[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return products;

  return products.filter((product) => {
    const text = [
      product.title,
      product.description,
      product.category,
      product.brand ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(q);
  });
}

export function queryProducts(
  products: Product[],
  query: string,
  category: string,
) {
  const matches = searchProducts(products, query);
  const selectedCategory = category.trim().toLowerCase();
  if (!selectedCategory) return matches;

  return matches.filter(
    (product) => product.category.toLowerCase() === selectedCategory,
  );
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 40;

export function parsePagination(
  pageRaw: unknown,
  limitRaw: unknown,
): { page: number; limit: number } {
  const pageNumber = Number(pageRaw);
  const page =
    Number.isFinite(pageNumber) && pageNumber >= 1
      ? Math.floor(pageNumber)
      : DEFAULT_PAGE;

  const limitNumber = Number(limitRaw);
  const limit =
    Number.isFinite(limitNumber) && limitNumber >= 1
      ? Math.min(Math.floor(limitNumber), MAX_LIMIT)
      : DEFAULT_LIMIT;

  return { page, limit };
}

export function paginate<T>(items: T[], page: number, limit: number): T[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

export function sortByPrice<T extends { price?: number }>(
  products: T[],
  sort = "asc",
) {
  const direction = sort === "desc" ? -1 : 1;

  return [...products].sort((a, b) => {
    if (a.price == null && b.price == null) return 0;
    if (a.price == null) return 1;
    if (b.price == null) return -1;
    return (a.price - b.price) * direction;
  });
}

export function suggestProducts(
  products: Product[],
  query: string,
  limit = 8,
): string[] {
  const q = query.trim().toLowerCase();

  if (q.length < 2) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const product of products) {
    const text = [
      product.title,
      product.description,
      product.category,
      product.brand ?? "",
    ]
      .join(" ")
      .toLowerCase();

    if (!text.includes(q)) continue;
    if (seen.has(product.title)) continue;
    seen.add(product.title);
    out.push(product.title);
    if (out.length >= limit) break;
  }

  return out;
}
