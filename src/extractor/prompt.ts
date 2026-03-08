import type { PDFLayout } from '../types';

/**
 * Build the system prompt for the OpenAI extraction call.
 * The AI receives a list of fields discovered in the PDF and must
 * return a JSON object { fieldLabel: extractedValue, ... }.
 */
export function buildExtractionPrompt(layout: PDFLayout): string {
  const fieldList = layout.pages
    .flatMap((p) => p.fieldSlots)
    .map((s) => `- "${s.label}" (type: ${s.type})`)
    .join('\n');

  return `You are a data extraction assistant. You will be given the text content of a PDF document.

Your task is to extract the value for each of the following fields and return them as a single JSON object.
The JSON keys must exactly match the field labels listed below.
For fields with no value found in the document, use null.
For checkbox fields, use true or false.
For date fields, use ISO 8601 format (YYYY-MM-DD).
For table fields, use an array of objects where each object represents a row.

Fields to extract:
${fieldList}

Respond with ONLY a valid JSON object. No markdown, no explanation.`;
}

/**
 * Build the user message containing the raw PDF text.
 */
export function buildExtractionUserMessage(pdfText: string): string {
  return `PDF document text:\n\n${pdfText}`;
}
