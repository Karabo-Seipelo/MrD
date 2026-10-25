export function requireElement<T extends Element>(
  parent: ParentNode,
  selector: string,
): T {
  const node = parent.querySelector(selector);
  if (!node) {
    throw new Error(`Missing element: ${selector}`);
  }
  return node as T;
}
