import type {
  IFormDataExtractor,
  PDFLayout,
  ExtractedFormData,
  PDFormerAIConfig,
} from "../types";
import { createOpenAIClient, callChatCompletion } from "./openaiClient";
import { buildExtractionPrompt, buildExtractionUserMessage } from "./prompt";

/**
 * Built-in extractor that uses OpenAI (standard or Azure) to extract field
 * values from a PDF given the detected layout.
 *
 * The AI receives:
 *  - A list of field labels + types (from the layout)
 *  - The raw text content of the PDF
 * and returns a JSON object mapping label → value.
 */
export class OpenAIExtractor implements IFormDataExtractor {
  constructor(private readonly config: PDFormerAIConfig) {}

  async extract(
    pdfBuffer: ArrayBuffer | Buffer,
    layout: PDFLayout,
  ): Promise<ExtractedFormData> {
    const client = createOpenAIClient(this.config);

    // Extract plain text from the PDF for the AI to read
    const pdfText = await extractRawText(pdfBuffer);

    const systemPrompt = buildExtractionPrompt(layout);
    const userMessage = buildExtractionUserMessage(pdfText);

    let raw: string;
    try {
      raw = await callChatCompletion(
        client,
        this.config,
        systemPrompt,
        userMessage,
      );
    } catch (err) {
      throw new Error(`OpenAIExtractor: AI call failed — ${String(err)}`);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // Retry once with a stricter repair prompt
      const repairPrompt = `The previous response was not valid JSON. Return ONLY a valid JSON object with no extra text. The object must map field labels to their extracted string/number/boolean values.`;
      try {
        const repaired = await callChatCompletion(
          client,
          this.config,
          repairPrompt,
          `Original response to fix:\n${raw}`,
        );
        parsed = JSON.parse(repaired) as Record<string, unknown>;
      } catch {
        throw new Error(
          "OpenAIExtractor: AI returned malformed JSON and repair failed.",
        );
      }
    }

    // Map the AI's label-keyed response back to slot IDs
    return mapToSlotIds(parsed, layout);
  }
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

/** Build a slot-ID keyed result from an AI response keyed by label. */
function mapToSlotIds(
  aiResult: Record<string, unknown>,
  layout: PDFLayout,
): ExtractedFormData {
  const output: ExtractedFormData = {};

  for (const page of layout.pages) {
    for (const slot of page.fieldSlots) {
      // Try matching by slot ID first, then by label (case-insensitive)
      const byId = aiResult[slot.id];
      const byLabel =
        aiResult[slot.label] ?? aiResult[slot.label.toLowerCase()];
      const value = byId ?? byLabel;

      // Include all fields, even empty strings, but skip undefined/null
      if (value !== undefined && value !== null) {
        output[slot.id] = value as string | number | boolean;
      } else {
        // Provide default empty values for fields not returned by AI
        if (slot.type === "checkbox") {
          output[slot.id] = false;
        } else if (slot.type === "table") {
          output[slot.id] = [];
        } else {
          output[slot.id] = "";
        }
      }
    }
  }

  return output;
}

/** Extract raw text from PDF using pdfjs-dist (reuses the layout reader path). */
async function extractRawText(buffer: ArrayBuffer | Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Convert to Uint8Array (pdfjs-dist requires Uint8Array, not Buffer)
  // Create a copy to avoid detached ArrayBuffer issues
  const data = new Uint8Array(
    buffer instanceof ArrayBuffer ? buffer : Buffer.from(buffer),
  );
  const pdf = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  const parts: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    parts.push(
      tc.items
        .filter(
          (i): i is import("pdfjs-dist/types/src/display/api").TextItem =>
            "str" in i,
        )
        .map((i) => i.str)
        .join(" "),
    );
  }

  return parts.join("\n\n");
}
