// ──────────────────────────────────────────────────────────────────
// Field Types
// ──────────────────────────────────────────────────────────────────

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "radio"
  | "table";

// ──────────────────────────────────────────────────────────────────
// PDF Layout — describes visual structure, no field values
// ──────────────────────────────────────────────────────────────────

export interface BoundingBox {
  /** Distance from left edge of page in PDF points */
  x: number;
  /** Distance from top edge of page in PDF points */
  y: number;
  width: number;
  height: number;
}

export interface FieldSlot {
  /** Stable ID derived from page + position + label */
  id: string;
  /** Detected label text adjacent to this field */
  label: string;
  /** Inferred field type */
  type: FieldType;
  /** Position and size in PDF points */
  bbox: BoundingBox;
  /** 1-based page number */
  pageNumber: number;
  /** Detected options for select / radio slots */
  options?: string[];
  /** For text fields: whether to use multiline/textarea */
  multiline?: boolean;
}

export interface StaticBlock {
  kind: "text" | "image" | "line" | "rect";
  bbox: BoundingBox;
  /** Text content (for kind === 'text') */
  content?: string;
  pageNumber: number;
}

export interface PDFPageLayout {
  /** 1-based page number */
  pageNumber: number;
  /** Page width in PDF points */
  width: number;
  /** Page height in PDF points */
  height: number;
  /** Interactive field areas detected on this page */
  fieldSlots: FieldSlot[];
  /** Non-interactive content blocks */
  staticBlocks: StaticBlock[];
}

export interface PDFLayout {
  pageCount: number;
  pages: PDFPageLayout[];
}

// ──────────────────────────────────────────────────────────────────
// Extracted Data — values supplied entirely by the consumer
// ──────────────────────────────────────────────────────────────────

export type TableData = Array<Record<string, string | number | boolean>>;
export type FieldValue = string | number | boolean | string[] | TableData;

/**
 * Flat map of field slot IDs (or labels) → extracted values.
 * Produced by any IFormDataExtractor implementation and passed into the editor.
 */
export type ExtractedFormData = Record<string, FieldValue>;

// ──────────────────────────────────────────────────────────────────
// Bound Field — layout slot merged with extracted data
// ──────────────────────────────────────────────────────────────────

export interface BoundField {
  slot: FieldSlot;
  /** Current (possibly user-edited) value */
  value: FieldValue;
  /** true when extractedData contained a value for this slot */
  editable: boolean;
}

// ──────────────────────────────────────────────────────────────────
// Extractor Interface — plug-in contract
// ──────────────────────────────────────────────────────────────────

export interface IFormDataExtractor {
  /**
   * Given a PDF buffer and its detected layout, return a map of
   * field slot IDs (or labels) to extracted values.
   */
  extract(
    pdfBuffer: ArrayBuffer | Buffer,
    layout: PDFLayout,
    config?: unknown,
  ): Promise<ExtractedFormData>;
}

// ──────────────────────────────────────────────────────────────────
// OpenAI Configuration — used by the built-in OpenAIExtractor
// ──────────────────────────────────────────────────────────────────

export interface PDFormerAIConfig {
  /** OpenAI or Azure OpenAI API key */
  apiKey: string;
  /**
   * Standard OpenAI: omit to use https://api.openai.com/v1.
   * Azure: full resource endpoint e.g. https://<resource>.openai.azure.com
   * Self-hosted: any OpenAI-compatible base URL.
   */
  endpoint?: string;
  /** Model name. Default: "gpt-4o". */
  model?: string;
  /** Set true to use the Azure OpenAI SDK path. */
  isAzure?: boolean;
  /** Azure deployment name (if different from model). */
  azureDeploymentName?: string;
  /** Azure API version. Default: "2024-02-01". */
  azureApiVersion?: string;
  /** Max completion tokens. Default: 4096. */
  maxTokens?: number;
  /** Sampling temperature. Default: 0 (deterministic). */
  temperature?: number;
}

// ──────────────────────────────────────────────────────────────────
// Component Props
// ──────────────────────────────────────────────────────────────────

export interface PDFormerAIEditorProps {
  /** Output of extractPDFLayout() */
  layout: PDFLayout;
  /** Values from any IFormDataExtractor implementation */
  extractedData: ExtractedFormData;
  /** Called when the user clicks Save */
  onSave?: (data: ExtractedFormData) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Render in read-only mode (no editing, no save button) */
  readOnly?: boolean;
  /** PDF points → CSS pixels scale factor. Default: 1.5 */
  scale?: number;
  /** Save button label. Default: "Save" */
  saveLabel?: string;
}

// ──────────────────────────────────────────────────────────────────
// Hook Return
// ──────────────────────────────────────────────────────────────────

export interface UsePDFormerAIResult {
  boundFields: BoundField[];
  /** Update a single field value by slot ID */
  updateField: (slotId: string, value: FieldValue) => void;
  /** Get current ExtractedFormData snapshot */
  getFormData: () => ExtractedFormData;
}
