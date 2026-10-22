export function paginate(items, page, limit) {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

export function sortByPrice(products, sort = "asc") {
  const direction = sort === "desc" ? -1 : 1;

  return [...products].sort((a, b) => {
    if (a.price == null && b.price == null) return 0;
    if (a.price == null) return 1;
    if (b.price == null) return -1;
    return (a.price - b.price) * direction;
  });
}
