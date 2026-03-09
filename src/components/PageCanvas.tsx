import React from "react";
import Box from "@mui/material/Box";
import type { PDFPageLayout, BoundField, FieldValue } from "../types";
import { FieldRenderer } from "./fields/FieldRenderer";
import { StaticBlockRenderer } from "./StaticBlockRenderer";

interface Props {
  page: PDFPageLayout;
  /** BoundFields that belong to this page */
  boundFields: BoundField[];
  onChange: (slotId: string, value: FieldValue) => void;
  readOnly?: boolean;
  scale?: number;
}

/**
 * Renders a single PDF page as a positioned container.
 * Static blocks and editable field slots are absolutely positioned
 * within the container to mirror the original PDF layout.
 */
export const PageCanvas: React.FC<Props> = ({
  page,
  boundFields,
  onChange,
  readOnly = false,
  scale = 1.5,
}) => {
  return (
    <Box
      sx={{
        position: "relative",
        width: page.width * scale,
        height: page.height * scale,
        backgroundColor: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        mb: 1,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Static / non-editable PDF content */}
      {page.staticBlocks.map((block, i) => (
        <StaticBlockRenderer key={`static-${i}`} block={block} scale={scale} />
      ))}

      {/* Editable (and read-only unmatched) field slots */}
      {boundFields.map((bf) => (
        <FieldRenderer
          key={bf.slot.id}
          boundField={bf}
          onChange={onChange}
          readOnly={readOnly}
          scale={scale}
        />
      ))}
    </Box>
  );
};
