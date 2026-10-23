export function mergeProductOffers(previous, incoming) {
  const prevById = new Map(previous.map((product) => [product.id, product]));
  return incoming.map((product) => {
    const prior = prevById.get(product.id);
    if (!prior) return product;
    return {
      ...product,
      price: product.price ?? prior.price,
      availabilityStatus:
        product.availabilityStatus ?? prior.availabilityStatus,
      shippingInformation:
        product.shippingInformation ?? prior.shippingInformation,
    };
  });
}
