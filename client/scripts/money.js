const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZAR",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value) {
  return money
    .formatToParts(value)
    .filter((part) => part.type !== "literal")
    .map((part) => part.value)
    .join("");
}
