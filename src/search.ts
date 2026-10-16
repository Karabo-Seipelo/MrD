export type Product = {
  title: string;
  description: string;
  category: string;
  brand?: string;
  tags?: string[];
  price: number;
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
  sort = "asc",
) {
  const matches = searchProducts(products, query);
  const selectedCategory = category.trim().toLowerCase();
  const filtered = selectedCategory
    ? matches.filter(
        (product) => product.category.toLowerCase() === selectedCategory,
      )
    : matches;
  const direction = sort === "desc" ? -1 : 1;

  return [...filtered].sort((a, b) => (a.price - b.price) * direction);
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
