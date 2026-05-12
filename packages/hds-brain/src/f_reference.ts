const F_REFERENCE_PREFIX = "F:";
const F_REFERENCE_PATTERN = /\bF:([A-Za-z0-9_.:-]+)\b/g;

export function fReferenceForId(id: string): string {
  return `${F_REFERENCE_PREFIX}${id}`;
}

export function idFromFReference(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith(F_REFERENCE_PREFIX)) return null;
  const id = trimmed.slice(F_REFERENCE_PREFIX.length);
  return id.length > 0 ? id : null;
}

export function referenceIdFromInput(value: string): string {
  return idFromFReference(value) ?? value;
}

export function fReferencesFromText(text: string): string[] {
  const refs = new Set<string>();
  for (const match of text.matchAll(F_REFERENCE_PATTERN)) {
    const id = match[1];
    if (id) refs.add(fReferenceForId(id));
  }
  return Array.from(refs);
}
