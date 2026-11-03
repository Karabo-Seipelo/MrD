export type DbCatalogProduct = {
  id: number;
  title: string;
  description: string;
  category: string;
  brand?: string;
  tags?: string[];
};

export type DbOffer = {
  id: number;
  price: number;
  availabilityStatus: string;
  shippingInformation: string;
};
