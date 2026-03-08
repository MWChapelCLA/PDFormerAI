# PDFormerAI — Design Document (v2)

## Overview

PDFormerAI is an NPM-publishable TypeScript/React library with two distinct responsibilities:

1. **PDF Layout Analysis** — parse a PDF to extract its *visual structure*: field positions, bounding boxes, section geometry, and labels. This drives how the form is rendered so it looks positionally similar to the original document.

2. **Form Editor** — accept externally-supplied extracted data (field values from any source), merge it with the PDF layout, and render an interactive MUI/React form. Only fields whose data was provided by the extractor are editable. The rest of the PDF content is rendered as non-interactive background.

The data extraction step is **decoupled** from the library. Consumers can use:
- The included `OpenAIExtractor` (calls an OpenAI/Azure endpoint)
- Their own extractor implementing the `IFormDataExtractor` interface
- A hardcoded/manual data object

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Consumer App                            │
│                                                                  │
│  const layout = await extractPDFLayout(pdfBuffer);              │
│  const data   = await myExtractor.extract(pdfBuffer, layout);   │
│                                                                  │
│  <PDFormerAIEditor                                               │
│      layout={layout}                                             │
│      extractedData={data}                                        │
│      onSave={handleSave}                                         │
│  />                                                              │
└──────────────────────────────────────────────────────────────────┘
            │                         │
 ┌──────────▼──────────┐    ┌─────────▼──────────────┐
 │  PDF Layout Engine  │    │     Form Editor         │
 │  extractPDFLayout() │    │  PDFormerAIEditor       │
 │  - page dimensions  │    │  - PDF-like background  │
 │  - field bboxes     │    │  - editable fields at   │
 │  - section geometry │    │    exact PDF positions  │
 │  - static blocks    │    │  - unmatched slots are  │
 └─────────────────────┘    │    read-only/static     │
                            └────────────────────────-┘
                                        │
                             ┌──────────▼──────────┐
                             │  IFormDataExtractor  │  ← plug-in interface
                             │  (any implementation)│
                             │  ┌────────────────┐  │
                             │  │ OpenAIExtractor│  │  ← built-in
                             │  └────────────────┘  │
                             └─────────────────────-┘
```

---

## Key Concepts

### PDF Layout (`PDFLayout`)

Describes the **visual structure** without values:

- Page count, width, height (in points)
- **Field slots** — bounding box, label text, inferred field type for each interactive field area
- **Static blocks** — logos, decorative lines, static text — rendered but not editable

Produced by `extractPDFLayout(pdfBuffer)` using `pdfjs-dist`.

### Extracted Data (`ExtractedFormData`)

A flat record mapping field slot IDs (matched by label) to their values:

```ts
type ExtractedFormData = Record<string, FieldValue>;
type FieldValue = string | number | boolean | string[] | TableData;
```

This comes **entirely from outside the library**. The consumer is responsible for calling their extractor and passing the result in.

### Binding: Layout + Data → Rendered Form

1. Iterate `PDFLayout.fieldSlots`
2. Look up each slot's label in `extractedData`
3. **Match found** → render as an editable MUI field at the slot's bbox position
4. **No match** → render as static/read-only text at the slot's bbox position
5. Static blocks → rendered as non-interactive overlays

---

## Types (`src/types/index.ts`)

```ts
// Layout
interface PDFLayout {
  pageCount: number;
  pages: PDFPageLayout[];
}

interface PDFPageLayout {
  pageNumber: number;       // 1-based
  width: number;            // pts
  height: number;           // pts
  fieldSlots: FieldSlot[];
  staticBlocks: StaticBlock[];
}

interface FieldSlot {
  id: string;               // stable ID derived from position + label
  label: string;            // detected label text near the field
  type: FieldType;          // inferred: text | number | date | checkbox | select | radio | table
  bbox: BoundingBox;        // { x, y, width, height } in points
  pageNumber: number;
  options?: string[];       // for select/radio slots detected from the PDF
}

interface BoundingBox { x: number; y: number; width: number; height: number; }

interface StaticBlock {
  kind: 'text' | 'image' | 'line' | 'rect';
  bbox: BoundingBox;
  content?: string;
  pageNumber: number;
}

// Data
type FieldValue = string | number | boolean | string[] | TableData;
type TableData  = Array<Record<string, string | number | boolean>>;
type ExtractedFormData = Record<string, FieldValue>;

// Merged
interface BoundField {
  slot: FieldSlot;
  value: FieldValue;
  editable: boolean;
}

// Extractor interface
interface IFormDataExtractor {
  extract(
    pdfBuffer: ArrayBuffer | Buffer,
    layout: PDFLayout,
    config?: unknown,
  ): Promise<ExtractedFormData>;
}

// Config (used by built-in OpenAIExtractor)
interface PDFormerAIConfig {
  apiKey: string;
  endpoint?: string;
  model?: string;
  isAzure?: boolean;
  azureDeploymentName?: string;
  azureApiVersion?: string;
  maxTokens?: number;
  temperature?: number;
}
```

---

## Module Breakdown

### `src/layout/`

| File | Responsibility |
|------|----------------|
| `pdfReader.ts` | `pdfjs-dist` wrapper — extracts text items with positions and operator lists |
| `regionDetector.ts` | Heuristics: underlines → text slots, small squares → checkboxes, grid lines → table slots |
| `fieldClassifier.ts` | Infers `FieldType` from label text ("Date", "Amount $", "Y/N", etc.) |
| `index.ts` | `extractPDFLayout(buffer): Promise<PDFLayout>` — public entry point |

### `src/extractor/`

| File | Responsibility |
|------|----------------|
| `IFormDataExtractor.ts` | Interface definition |
| `openaiClient.ts` | Azure / standard OpenAI SDK wrapper |
| `prompt.ts` | System prompt template — asks AI to fill field values given slot labels |
| `openaiExtractor.ts` | `OpenAIExtractor` — sends slot labels + PDF text to AI, maps values back to slot IDs |

### `src/components/`

| File | Responsibility |
|------|----------------|
| `PDFormerAIEditor.tsx` | Top-level component; iterates pages, manages form state |
| `PageCanvas.tsx` | Single-page positional container (sized to page pts × scale) |
| `StaticBlockRenderer.tsx` | Renders non-editable PDF content at absolute positions |
| `fields/FieldRenderer.tsx` | Dispatcher → correct field component based on `slot.type` |
| `fields/*Renderer.tsx` | Individual MUI field components sized to `slot.bbox` |

**`PDFormerAIEditor` props:**

| Prop | Type | Description |
|------|------|-------------|
| `layout` | `PDFLayout` | Output of `extractPDFLayout()` |
| `extractedData` | `ExtractedFormData` | Values from any extractor |
| `onSave` | `(data: ExtractedFormData) => void` | Called on Save |
| `onError` | `(err: Error) => void` | Error handler |
| `readOnly` | `boolean` | Disable all editing |
| `scale` | `number` | pt → px scale factor (default `1.5`) |
| `saveLabel` | `string` | Save button text (default `"Save"`) |

### `src/hooks/usePDFormerAI.ts`

Headless usage:

```ts
const { boundFields, updateField, getFormData } = usePDFormerAI(layout, extractedData);
```

### `src/utils/bindLayoutToData.ts`

Pure function — merges `PDFLayout` + `ExtractedFormData` → `BoundField[]`.

---

## Project Structure

```
pdformerai/
├── src/
│   ├── types/index.ts
│   ├── layout/
│   │   ├── pdfReader.ts
│   │   ├── regionDetector.ts
│   │   ├── fieldClassifier.ts
│   │   └── index.ts
│   ├── extractor/
│   │   ├── IFormDataExtractor.ts
│   │   ├── openaiClient.ts
│   │   ├── prompt.ts
│   │   └── openaiExtractor.ts
│   ├── components/
│   │   ├── PDFormerAIEditor.tsx
│   │   ├── PageCanvas.tsx
│   │   ├── StaticBlockRenderer.tsx
│   │   └── fields/
│   │       ├── FieldRenderer.tsx
│   │       ├── TextFieldRenderer.tsx
│   │       ├── NumberFieldRenderer.tsx
│   │       ├── DateFieldRenderer.tsx
│   │       ├── SelectFieldRenderer.tsx
│   │       ├── CheckboxFieldRenderer.tsx
│   │       ├── RadioFieldRenderer.tsx
│   │       └── TableFieldRenderer.tsx
│   ├── hooks/usePDFormerAI.ts
│   ├── utils/bindLayoutToData.ts
│   └── index.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

---

## Data Flow

```
pdfBuffer ──► extractPDFLayout() ──────────────► PDFLayout
                                                      │
                                       IFormDataExtractor.extract()
                                                      │
                                              ExtractedFormData
                                                      │
                                          bindLayoutToData()
                                                      │
                                               BoundField[]
                                                      │
                                         PDFormerAIEditor renders
                                         pages with fields at
                                         exact PDF positions
                                                      │
                                            User edits fields
                                                      │
                                         onSave(ExtractedFormData)
```

---

## Additional Considerations

- **Scale / zoom:** `scale` prop converts PDF points to CSS pixels (1.5 is a good default for screen).
- **Multi-page:** Each page is a separate `PageCanvas`; the editor scrolls vertically.
- **Responsive fallback:** If viewport is narrower than the scaled page, horizontal scroll preserves positional fidelity rather than reflowing.
- **Extractor flexibility:** Any AI (Anthropic, Gemini, local LLM) or rules-based parser can implement `IFormDataExtractor`.
- **Retry / repair:** `OpenAIExtractor` retries once with a stricter prompt on malformed JSON.
- **Accessibility:** Each editable field has an `aria-label` from `slot.label`; static blocks are `aria-hidden`.
- **Security:** `apiKey` never appears in rendered HTML; recommend a server-side proxy for browser deployments.
- **Testing:** Vitest unit tests for layout heuristics, binding logic, and mocked extractor calls.
