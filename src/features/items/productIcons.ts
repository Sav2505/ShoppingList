import productIconCatalog from './product-icons.json';

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0591-\u05C7]/g, '')
  .toLocaleLowerCase('he')
  .replace(/[״׳"']/g, '')
  .replace(/[^\p{L}\p{N}\s%]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const iconByName = new Map<string, string>();
for (const product of productIconCatalog) {
  for (const name of product.names) {
    iconByName.set(normalize(name), product.emoji);
  }
}

const namesByLength = [...iconByName.keys()].sort((first, second) => second.length - first.length);

export function getProductIcon(name: string): string | undefined {
  const normalizedName = normalize(name);
  const exactMatch = iconByName.get(normalizedName);
  if (exactMatch) return exactMatch;

  return namesByLength.find((productName) => ` ${normalizedName} `.includes(` ${productName} `))
    ? iconByName.get(namesByLength.find((productName) => ` ${normalizedName} `.includes(` ${productName} `))!)
    : undefined;
}