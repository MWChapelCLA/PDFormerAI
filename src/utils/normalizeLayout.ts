import type { PDFLayout, PDFPageLayout, FieldSlot } from "../types";

/**
 * Normalizes the PDF layout to create a more compact, left-aligned form view.
 *
 * This function:
 * - Shifts all fields to start from a minimal left margin
 * - Compacts vertical spacing while preserving relative field order
 * - Maintains relative positions between fields on the same line
 */
export function normalizeLayout(layout: PDFLayout): PDFLayout {
  return {
    ...layout,
    pages: layout.pages.map(normalizePage),
  };
}

function normalizePage(page: PDFPageLayout): PDFPageLayout {
  if (page.fieldSlots.length === 0) {
    return page;
  }

  const leftMargin = 20;
  const rightMargin = 20;
  const columnGap = 20; // Gap between left and right columns
  const rowSpacing = 55; // Reduced vertical spacing
  const multilineFieldHeight = 90; // Extra height for multiline fields

  // Calculate column widths based on page width
  const availableWidth = page.width - leftMargin - rightMargin;
  const columnWidth = Math.floor((availableWidth - columnGap) / 2);
  const secondColumnX = leftMargin + columnWidth + columnGap;
  const fullWidth = availableWidth;

  // Separate table fields from regular fields
  const tableFields = page.fieldSlots.filter((slot) => slot.type === "table");
  const regularFields = page.fieldSlots.filter((slot) => slot.type !== "table");

  // Sort regular fields by Y position (top to bottom)
  const sortedFields = [...regularFields].sort((a, b) => a.bbox.y - b.bbox.y);

  const normalizedFields: FieldSlot[] = [];
  let currentY = 20;
  let columnX = leftMargin;

  // Layout strategy: 2-column grid for small fields, full width for multiline
  for (let i = 0; i < sortedFields.length; i++) {
    const slot = sortedFields[i];
    const isMultiline = slot.multiline || slot.type === "table";
    const nextSlot = sortedFields[i + 1];

    // Check if this field and next can fit side-by-side
    const canPairWithNext =
      !isMultiline &&
      nextSlot &&
      !nextSlot.multiline &&
      nextSlot.type !== "table" &&
      Math.abs(slot.bbox.y - nextSlot.bbox.y) < 40; // Close in Y position

    if (isMultiline) {
      // Full width for multiline/textarea fields
      normalizedFields.push({
        ...slot,
        bbox: {
          ...slot.bbox,
          x: leftMargin,
          y: currentY,
          width: fullWidth,
        },
      });
      currentY += multilineFieldHeight;
    } else if (canPairWithNext && columnX === leftMargin) {
      // Place in left column
      normalizedFields.push({
        ...slot,
        bbox: {
          ...slot.bbox,
          x: leftMargin,
          y: currentY,
          width: columnWidth,
        },
      });
      columnX = secondColumnX;
    } else if (columnX > leftMargin) {
      // Place in right column (pair complete)
      normalizedFields.push({
        ...slot,
        bbox: {
          ...slot.bbox,
          x: columnX,
          y: currentY,
          width: columnWidth,
        },
      });
      currentY += rowSpacing;
      columnX = leftMargin;
    } else {
      // Single field, use column width (not full width)
      normalizedFields.push({
        ...slot,
        bbox: {
          ...slot.bbox,
          x: leftMargin,
          y: currentY,
          width: columnWidth,
        },
      });
      currentY += rowSpacing;
    }
  }

  // Add table fields at the end
  for (const tableSlot of tableFields) {
    normalizedFields.push({
      ...tableSlot,
      bbox: {
        ...tableSlot.bbox,
        x: leftMargin,
        y: currentY,
        width: fullWidth,
      },
    });
    currentY += tableSlot.bbox.height + 20;
  }

  // Adjust page height to fit normalized content
  const maxFieldBottom = Math.max(
    ...normalizedFields.map((slot) => slot.bbox.y + slot.bbox.height),
  );
  const normalizedHeight = maxFieldBottom + 40;

  return {
    ...page,
    fieldSlots: normalizedFields,
    height: normalizedHeight,
  };
}

/**
 * Groups fields that appear on approximately the same Y position (same row).
 * Fields are considered on the same row if their Y positions are within a threshold.
 */
function groupFieldsByRow(fields: FieldSlot[]): FieldSlot[][] {
  const sorted = [...fields].sort((a, b) => {
    // Sort by Y first, then by X
    if (Math.abs(a.bbox.y - b.bbox.y) < 5) {
      return a.bbox.x - b.bbox.x;
    }
    return a.bbox.y - b.bbox.y;
  });

  const rows: FieldSlot[][] = [];
  let currentRow: FieldSlot[] = [];
  let currentRowY: number | null = null;
  const rowThreshold = 40; // Fields within 40 pts are considered same row

  for (const field of sorted) {
    if (
      currentRowY === null ||
      Math.abs(field.bbox.y - currentRowY) < rowThreshold
    ) {
      // Same row
      currentRow.push(field);
      if (currentRowY === null) {
        currentRowY = field.bbox.y;
      }
    } else {
      // New row
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [field];
      currentRowY = field.bbox.y;
    }
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}
