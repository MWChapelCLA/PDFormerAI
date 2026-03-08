import type {
  PDFLayout,
  ExtractedFormData,
  BoundField,
  FieldValue,
} from '../types';

/**
 * Merges a PDFLayout with ExtractedFormData to produce BoundField[].
 *
 * Each FieldSlot in the layout becomes a BoundField:
 *  - editable=true  if extractedData contains a value for the slot (by ID or label)
 *  - editable=false if no matching value was found (renders read-only / empty)
 */
export function bindLayoutToData(
  layout: PDFLayout,
  extractedData: ExtractedFormData,
): BoundField[] {
  const boundFields: BoundField[] = [];

  for (const page of layout.pages) {
    for (const slot of page.fieldSlots) {
      // Prefer exact slot ID match; fall back to label match
      const value: FieldValue | undefined =
        extractedData[slot.id] ??
        extractedData[slot.label] ??
        extractedData[slot.label.toLowerCase()];

      boundFields.push({
        slot,
        value: value ?? '',
        editable: value !== undefined,
      });
    }
  }

  return boundFields;
}
