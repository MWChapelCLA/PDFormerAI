import type { FieldType } from "../types";

// Keywords that strongly hint the field type
const DATE_HINTS = /\b(date|dob|born|expir|effective|start|end|issued|due)\b/i;
const NUMBER_HINTS =
  /\b(amount|total|qty|quantity|price|cost|fee|payment|balance|rate|percent|%|\$|wage|salary|income|tax|withh?eld|deduction|credit)\b/i;
const CHECKBOX_HINTS = /\b(yes|no|y\/n|check|select|mark|agree)\b/i;
const RADIO_HINTS =
  /\b(choose|option|type|status|gender|mr\.?|mrs\.?|ms\.?)\b/i;
const TABLE_HINTS =
  /\b(items?|description|line items?|details?|charges?|breakdown|list|entries)\b/i;
const ADDRESS_HINTS = /\b(address|from|to|street|location|city|state|zip)\b/i;
// Pattern for ID-like fields that should remain as text (SSN, EIN, OMB No, etc.)
const ID_FIELD_HINTS =
  /\b(ssn|ein|id[\s-]?no|omb[\s-]?no|account[\s-]?no|routing[\s-]?no|reference[\s-]?no)\b/i;

/**
 * Infer a FieldType from the label text found adjacent to a field slot.
 */
export function classifyField(label: string): FieldType {
  // Check for ID fields first - these should always be text
  if (ID_FIELD_HINTS.test(label)) return "text";

  if (TABLE_HINTS.test(label)) return "table";
  if (CHECKBOX_HINTS.test(label)) return "checkbox";
  if (RADIO_HINTS.test(label)) return "radio";
  if (DATE_HINTS.test(label)) return "date";
  if (NUMBER_HINTS.test(label)) return "number";
  return "text";
}

/**
 * Check if a text field should be multiline based on the label.
 * Only address-like fields with multiple components should be multiline.
 */
export function shouldBeMultiline(label: string): boolean {
  // Only consider full address fields as multiline, not short labels
  // Must have clear address indicators AND be longer form labels
  const isFullAddress =
    /\b(full[\s-]?address|mailing[\s-]?address|street[\s-]?address|billing[\s-]?address|shipping[\s-]?address)\b/i.test(
      label,
    );
  const isFromToField = /\b(from|to)\b/i.test(label) && label.length > 10;

  return isFullAddress || isFromToField;
}
