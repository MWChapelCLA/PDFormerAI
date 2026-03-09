import React, { useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import type { PDFormerAIEditorProps } from "../types";
import { usePDFormerAI } from "../hooks/usePDFormerAI";
import { normalizeLayout } from "../utils/normalizeLayout";
import { PageCanvas } from "./PageCanvas";

/**
 * PDFormerAIEditor
 *
 * Top-level component that renders a PDF document as an interactive form.
 * Accepts a PDFLayout (produced by extractPDFLayout) and ExtractedFormData
 * (produced by any IFormDataExtractor implementation).
 *
 * - Fields with extracted data are rendered as editable MUI inputs at their
 *   exact PDF positions.
 * - Fields without extracted data are rendered as read-only placeholders.
 * - Static PDF content (headings, labels, decorative elements) is rendered
 *   behind the fields to keep the visual structure of the original document.
 */
export const PDFormerAIEditor: React.FC<PDFormerAIEditorProps> = ({
  layout,
  extractedData,
  onSave,
  onError: _onError,
  readOnly = false,
  scale = 1.5,
  saveLabel = "Save",
}) => {
  // Normalize layout for compact, left-aligned display
  const normalizedLayout = useMemo(() => normalizeLayout(layout), [layout]);

  const { boundFields, updateField, getFormData } = usePDFormerAI(
    layout,
    extractedData,
  );

  const handleSave = () => {
    onSave?.(getFormData());
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0,
        overflowX: "auto",
        p: 2,
        backgroundColor: "#f0f0f0",
      }}
    >
      {normalizedLayout.pages.map((page) => {
        const pageFields = boundFields.filter(
          (bf) => bf.slot.pageNumber === page.pageNumber,
        );

        return (
          <PageCanvas
            key={page.pageNumber}
            page={page}
            boundFields={pageFields}
            onChange={updateField}
            readOnly={readOnly}
            scale={scale}
          />
        );
      })}

      {!readOnly && (
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" color="primary" onClick={handleSave}>
            {saveLabel}
          </Button>
        </Box>
      )}
    </Box>
  );
};
