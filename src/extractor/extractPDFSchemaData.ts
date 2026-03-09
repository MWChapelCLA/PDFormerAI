import type { PDFLayout, ExtractedFormData, PDFormerAIConfig } from "../types";
import { extractPDFLayout } from "../layout";
import { OpenAIExtractor } from "./openaiExtractor";

/**
 * ExtractionResult contains both the layout (visual structure + field positions)
 * and the extracted data values from the PDF.
 */
export interface ExtractionResult {
  /** Visual structure and field slot positions */
  layout: PDFLayout;
  /** Extracted field values keyed by slot ID */
  extractedData: ExtractedFormData;
}

/**
 * Extracts both the PDF layout (field positions, types, labels) and the
 * field data values in a single call.
 *
 * This is the main entry point for PDF extraction in this package.
 *
 * @param pdfBuffer  PDF file as ArrayBuffer or Node.js Buffer
 * @param config     OpenAI/Azure OpenAI configuration for data extraction
 * @returns Layout + extracted data ready to pass to PDFormerAIEditor
 *
 * @example
 * ```ts
 * import { extractPDFSchemaData } from 'pdformerai';
 *
 * const pdfBuffer = await fs.readFile('form.pdf');
 * const result = await extractPDFSchemaData(pdfBuffer, {
 *   apiKey: process.env.AZURE_OPENAI_API_KEY!,
 *   endpoint: process.env.AZURE_OPENAI_ENDPOINT,
 *   model: process.env.AZURE_OPENAI_DEPLOYMENT_ID,
 *   isAzure: true,
 *   azureApiVersion: process.env.AZURE_OPENAI_API_VERSION,
 * });
 *
 * // Pass result to your React component
 * <PDFormerAIEditor {...result} onSave={(data) => console.log(data)} />
 * ```
 */
export async function extractPDFSchemaData(
  pdfBuffer: ArrayBuffer | Buffer,
  config: PDFormerAIConfig,
): Promise<ExtractionResult> {
  // Step 1: Extract the layout (field positions, types, labels)
  const layout = await extractPDFLayout(pdfBuffer);

  // Step 2: Use OpenAI/Azure OpenAI to extract field values
  const extractor = new OpenAIExtractor(config);
  const extractedData = await extractor.extract(pdfBuffer, layout);

  return {
    layout,
    extractedData,
  };
}
