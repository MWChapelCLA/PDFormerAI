import type { FieldType } from '../types';

// Keywords that strongly hint the field type
const DATE_HINTS = /\b(date|dob|born|expir|effective|start|end|issued)\b/i;
const NUMBER_HINTS =
  /\b(amount|total|qty|quantity|price|cost|fee|payment|balance|rate|percent|%|\$|#|no\.?|num)\b/i;
const CHECKBOX_HINTS = /\b(yes|no|y\/n|check|select|mark)\b/i;
const RADIO_HINTS = /\b(choose|option|type|status|gender|mr\.?|mrs\.?|ms\.?)\b/i;
const TABLE_HINTS = /\b(items?|description|line items?|details?|charges?|breakdown)\b/i;

/**
 * Infer a FieldType from the label text found adjacent to a field slot.
 */
export function classifyField(label: string): FieldType {
  if (TABLE_HINTS.test(label)) return 'table';
  if (CHECKBOX_HINTS.test(label)) return 'checkbox';
  if (RADIO_HINTS.test(label)) return 'radio';
  if (DATE_HINTS.test(label)) return 'date';
  if (NUMBER_HINTS.test(label)) return 'number';
  return 'text';
}
