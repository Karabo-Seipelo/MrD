export type Product = {
  id: number;
  title: string;
  description: string;
  category: string;
  brand?: string;
  tags?: string[];
  price?: number;
  availabilityStatus?: string;
  shippingInformation?: string;
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
  category: string
) {
  const matches = searchProducts(products, query);
  const selectedCategory = category.trim().toLowerCase();
  if (!selectedCategory) return matches;

  return matches.filter(
    (product) => product.category.toLowerCase() === selectedCategory,
  );
}

export function sortByPrice<T extends { price?: number }>(products: T[], sort = "asc") {
  const direction = sort === "desc" ? -1 : 1;

  return [...products].sort((a, b) => {
    if (a.price == null && b.price == null) return 0;
    if (a.price == null) return 1;
    if (b.price == null) return -1;
    return (a.price - b.price) * direction;
  })
}

export function suggestProducts(products: Product[], query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  
  if (q.length < 2) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const product of products) {
    const text = [
      product.title,
      product.description,
      product.category,
      product.brand ?? ""
    ].join(" ").toLowerCase();

    if (!text.includes(q)) continue;
    if (seen.has(product.title)) continue;
    seen.add(product.title);
    out.push(product.title);
    if (out.length >= limit) break;
  }

  return out;
}
