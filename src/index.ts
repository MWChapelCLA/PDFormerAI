// ─── Layout ────────────────────────────────────────────────────────────────
export { extractPDFLayout } from './layout';

// ─── Data Extractors ───────────────────────────────────────────────────────
export { OpenAIExtractor } from './extractor/openaiExtractor';

// ─── React Component ───────────────────────────────────────────────────────
export { PDFormerAIEditor } from './components/PDFormerAIEditor';

// ─── React Hook (headless) ─────────────────────────────────────────────────
export { usePDFormerAI } from './hooks/usePDFormerAI';

// ─── Utilities ─────────────────────────────────────────────────────────────
export { bindLayoutToData } from './utils/bindLayoutToData';

// ─── Types ─────────────────────────────────────────────────────────────────
export type {
  // Layout
  PDFLayout,
  PDFPageLayout,
  FieldSlot,
  StaticBlock,
  BoundingBox,
  // Data
  FieldType,
  FieldValue,
  TableData,
  ExtractedFormData,
  BoundField,
  // Contracts
  IFormDataExtractor,
  PDFormerAIConfig,
  // Props
  PDFormerAIEditorProps,
  UsePDFormerAIResult,
} from './types';
