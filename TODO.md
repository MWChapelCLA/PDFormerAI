# PDFormerAI — TODO

## Status: Implementation in progress — devcontainer setup required before continuing

---

## ✅ Completed

- [x] **DESIGN_V2.md** — Full revised architecture documented
- [x] **package.json** — NPM library config with correct deps (`openai`, `pdfjs-dist`) and peer deps (React, MUI)
- [x] **tsconfig.json** — TypeScript config
- [x] **tsup.config.ts** — Dual ESM + CJS build config

### Source files written (`src/`)

- [x] `src/types/index.ts` — All types: `PDFLayout`, `FieldSlot`, `BoundingBox`, `StaticBlock`, `ExtractedFormData`, `BoundField`, `IFormDataExtractor`, `PDFormerAIConfig`, `PDFormerAIEditorProps`, `UsePDFormerAIResult`
- [x] `src/layout/pdfReader.ts` — pdfjs-dist wrapper, extracts text items with positions per page
- [x] `src/layout/regionDetector.ts` — Heuristics to detect field slots and static blocks from raw text items
- [x] `src/layout/fieldClassifier.ts` — Infers `FieldType` from label text
- [x] `src/layout/index.ts` — `extractPDFLayout()` public entry point
- [x] `src/extractor/openaiClient.ts` — Azure / standard OpenAI SDK wrapper
- [x] `src/extractor/prompt.ts` — System prompt builder using layout slot labels
- [x] `src/extractor/openaiExtractor.ts` — `OpenAIExtractor` class implementing `IFormDataExtractor`
- [x] `src/utils/bindLayoutToData.ts` — Merges `PDFLayout` + `ExtractedFormData` → `BoundField[]`
- [x] `src/hooks/usePDFormerAI.ts` — Headless React hook with `useReducer` state management
- [x] `src/components/fields/TextFieldRenderer.tsx`
- [x] `src/components/fields/NumberFieldRenderer.tsx`
- [x] `src/components/fields/DateFieldRenderer.tsx`
- [x] `src/components/fields/SelectFieldRenderer.tsx`
- [x] `src/components/fields/CheckboxFieldRenderer.tsx`
- [x] `src/components/fields/RadioFieldRenderer.tsx`
- [x] `src/components/fields/TableFieldRenderer.tsx`
- [x] `src/components/fields/FieldRenderer.tsx` — Dispatcher to correct renderer by `slot.type`
- [x] `src/components/StaticBlockRenderer.tsx` — Non-editable PDF content blocks
- [x] `src/components/PageCanvas.tsx` — Single page positional container
- [x] `src/components/PDFormerAIEditor.tsx` — Top-level React component
- [x] `src/index.ts` — Public API surface (all exports)

---

## 🔲 Next Steps (do inside devcontainer)

- [ ] **npm install** — Install all dependencies
- [ ] **Type-check** — `npm run type-check` and fix any TS errors
- [ ] **Build** — `npm run build` and verify `dist/` output
- [ ] **Write unit tests** — `src/__tests__/` using Vitest
  - [ ] `bindLayoutToData.test.ts`
  - [ ] `fieldClassifier.test.ts`
  - [ ] `openaiExtractor.test.ts` (mocked OpenAI)
  - [ ] `PDFormerAIEditor.test.tsx` (React Testing Library)
- [ ] **Write README.md** — Usage examples, API docs, install instructions
- [ ] **Storybook or demo app** — Optional: small Vite demo app showing the editor in action
- [ ] **npm publish** — Publish to NPM registry

---

## Architecture Summary

```
pdfBuffer ──► extractPDFLayout() ──► PDFLayout
                                          │
                             IFormDataExtractor.extract()
                             (OpenAIExtractor or your own)
                                          │
                                  ExtractedFormData
                                          │
                              bindLayoutToData() [internal]
                                          │
                                    BoundField[]
                                          │
                            PDFormerAIEditor renders
                            pages with fields at exact
                            PDF positions (scale * pts)
                                          │
                               User edits fields
                                          │
                          onSave(ExtractedFormData)
```

## Key Design Decisions

- **PDF drives layout, not schema** — the PDF's visual structure (bounding boxes) positions the form fields, so the rendered form looks like the original document
- **Data is external** — field values come from any `IFormDataExtractor`; the library doesn't force a specific AI provider
- **Only extracted fields are editable** — slots without a matching value in `extractedData` render as read-only; nothing is hidden
- **Scale prop** — converts PDF points to CSS pixels (`scale=1.5` is a good default for screen)
