import type {
  FieldSlot,
  StaticBlock,
  BoundingBox,
  PDFPageLayout,
} from "../types";
import type { RawPageData } from "./pdfReader";
import { classifyField, shouldBeMultiline } from "./fieldClassifier";

/** Minimum width (pts) for a text item to be considered a label */
const MIN_LABEL_WIDTH = 20;
/** Max vertical distance (pts) between a label and its field slot */
const LABEL_FIELD_PROXIMITY = 20;
/** Typical height (pts) assumed for a single-line input slot - reduced for smaller MUI fields */
const DEFAULT_FIELD_HEIGHT = 30;
/** Minimum vertical spacing between fields to prevent overlap */
const MIN_FIELD_VERTICAL_SPACING = 25;
/** Minimum text width to consider as a standalone text block (not a label) */
const STATIC_TEXT_MIN_WIDTH = 60;

/** Build a stable slot ID from page + position */
function makeSlotId(page: number, x: number, y: number, label: string): string {
  const sanitized = label.replace(/\W+/g, "_").slice(0, 24).toLowerCase();
  return `p${page}_${Math.round(x)}_${Math.round(y)}_${sanitized}`;
}

/** Extract the (x, y) coordinates from a PDF transform matrix */
function txToXY(transform: number[]): { x: number; y: number } {
  return { x: transform[4], y: transform[5] };
}

/** Convert pdfjs bottom-left y to top-left y */
function flipY(y: number, pageHeight: number): number {
  return pageHeight - y;
}

/** Check if a text item overlaps or is too close to any field slot */
function overlapsOrNearField(
  itemX: number,
  itemY: number,
  itemWidth: number,
  itemHeight: number,
  fieldSlots: FieldSlot[],
  labelPositions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>,
): boolean {
  // More generous proximity threshold to avoid clutter
  const PROXIMITY_BUFFER = 40; // pts

  for (const slot of fieldSlots) {
    // Check if overlaps with field slot area
    const xOverlap =
      itemX < slot.bbox.x + slot.bbox.width + PROXIMITY_BUFFER &&
      itemX + itemWidth > slot.bbox.x - PROXIMITY_BUFFER;
    const yOverlap =
      itemY < slot.bbox.y + slot.bbox.height + PROXIMITY_BUFFER &&
      itemY + itemHeight > slot.bbox.y - PROXIMITY_BUFFER;
    if (xOverlap && yOverlap) return true;
  }

  // Also check if it's a label for a field (we don't need to render it separately)
  for (const labelPos of labelPositions) {
    const isAtLabelPosition =
      Math.abs(itemX - labelPos.x) < 5 && Math.abs(itemY - labelPos.y) < 5;
    if (isAtLabelPosition) return true;
  }

  return false;
}

/** Check if fields form a table structure (multiple items at same Y, similar spacing) */
function detectTableStructure(
  items: Array<{ x: number; y: number; text: string; width: number }>,
): { isTable: boolean; minX: number; maxX: number; y: number } | null {
  if (items.length < 2) return null;

  // Check if items are aligned horizontally (same Y position)
  const firstY = items[0].y;
  const allAligned = items.every((item) => Math.abs(item.y - firstY) < 3);

  if (!allAligned) return null;

  // Check if items look like table headers
  const tableHeaderKeywords =
    /\b(desc|description|qty|quantity|unit|price|amount|total|item|date|name)\b/i;
  const hasTableKeywords =
    items.filter((item) => tableHeaderKeywords.test(item.text)).length >= 2;

  if (!hasTableKeywords) return null;

  const minX = Math.min(...items.map((i) => i.x));
  const maxX = Math.max(...items.map((i) => i.x + i.width));

  return { isTable: true, minX, maxX, y: firstY };
}

/** Check if a point is inside a table region */
function isInTableRegion(
  x: number,
  y: number,
  tableRegions: Array<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>,
): boolean {
  return tableRegions.some(
    (region) =>
      x >= region.minX - 20 &&
      x <= region.maxX + 20 &&
      y >= region.minY && // Don't exclude fields ABOVE the table
      y <= region.maxY + 20,
  );
}

/** Check if we've already seen a similar label at a nearby position */
function isDuplicateField(
  label: string,
  x: number,
  y: number,
  existingFields: FieldSlot[],
): boolean {
  const normalizedLabel = label.toLowerCase().trim();
  return existingFields.some((field) => {
    const isSameLabel = field.label.toLowerCase().trim() === normalizedLabel;
    const isNearby =
      Math.abs(field.bbox.x - x) < 10 && Math.abs(field.bbox.y - y) < 10;
    return isSameLabel && isNearby;
  });
}

/** Check if a new field would overlap with existing fields */
function wouldOverlapWithExistingFields(
  newX: number,
  newY: number,
  newWidth: number,
  newHeight: number,
  existingFields: FieldSlot[],
): boolean {
  const significantOverlapThreshold = 15; // pts - allow fields to be close

  for (const field of existingFields) {
    const xOverlap =
      newX < field.bbox.x + field.bbox.width && newX + newWidth > field.bbox.x;
    const yOverlap =
      newY < field.bbox.y + field.bbox.height &&
      newY + newHeight > field.bbox.y;

    if (xOverlap && yOverlap) {
      // Check if this is significant overlap or just adjacent fields
      const overlapAmount = Math.min(
        newY + newHeight - field.bbox.y,
        field.bbox.y + field.bbox.height - newY,
      );

      // Allow fields that are vertically adjacent (small overlap)
      if (overlapAmount > significantOverlapThreshold) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Detect field slots and static blocks from raw pdfjs text items.
 *
 * Strategy:
 *  1. Walk text items sorted by Y position (top-to-bottom).
 *  2. Items that are short and end with ':' or '.' are treated as labels.
 *  3. The field slot is placed immediately to the right of (or below) that label.
 *  4. Only render labels as static blocks (not field values or general content).
 *  5. Prevent duplicate fields from being created.
 */
export function detectRegions(
  rawPage: RawPageData,
): Omit<PDFPageLayout, "pageNumber"> {
  const { textItems, width, height } = rawPage;

  const fieldSlots: FieldSlot[] = [];
  const staticBlocks: StaticBlock[] = [];
  const labelPositions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  const tableRegions: Array<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }> = [];

  // Sort items top-to-bottom, left-to-right
  const sorted = [...textItems].sort((a, b) => {
    const ay = flipY(txToXY(a.transform).y, height);
    const by = flipY(txToXY(b.transform).y, height);
    if (Math.abs(ay - by) < 4)
      return txToXY(a.transform).x - txToXY(b.transform).x;
    return ay - by;
  });

  const seenIds = new Set<string>();
  const seenLabels = new Map<string, { x: number; y: number }>();

  // FIRST PASS: Detect table structures by looking for column headers
  const potentialTableHeaders: Map<
    number,
    Array<{ x: number; y: number; text: string; width: number; index: number }>
  > = new Map();

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const { x, y: rawY } = txToXY(item.transform);
    const y = flipY(rawY, height);
    const text = item.str.trim();

    if (!text) continue;

    // Look for potential table header text
    const isTableHeader =
      /\b(desc|description|qty|quantity|unit|price|cost|fee|amount|total|item|subtotal|tax)\b/i.test(
        text,
      );

    if (isTableHeader) {
      const yKey = Math.round(y / 5) * 5; // Group by approximate Y position
      if (!potentialTableHeaders.has(yKey)) {
        potentialTableHeaders.set(yKey, []);
      }
      potentialTableHeaders
        .get(yKey)!
        .push({ x, y, text, width: item.width, index: i });
    }
  }

  // Analyze potential table headers and create table fields
  for (const [yKey, headers] of potentialTableHeaders) {
    const tableInfo = detectTableStructure(headers);

    if (tableInfo && tableInfo.isTable) {
      // Found a table! Create a table field
      const firstHeader = headers[0].text.trim();
      // Derive table label from first header or use generic name
      const tableLabel =
        firstHeader.length > 20 ? "Items" : firstHeader.replace(/[:.]$/, "");
      const tableY = tableInfo.y;
      const tableX = tableInfo.minX;
      const tableWidth = tableInfo.maxX - tableInfo.minX;
      // Table height to cover content area - increased to capture summary rows
      const tableHeight = 400;

      const tableField: FieldSlot = {
        id: makeSlotId(rawPage.pageNumber, tableX, tableY, tableLabel),
        label: tableLabel,
        type: "table",
        bbox: {
          x: tableX,
          y: tableY - 5, // Start just above headers
          width: Math.max(tableWidth, 200),
          height: tableHeight,
        },
        pageNumber: rawPage.pageNumber,
      };

      fieldSlots.push(tableField);

      // Mark this region as a table exclusion zone
      // Only block fields BELOW the table header, not above it
      tableRegions.push({
        minX: tableX - 20,
        maxX: tableX + tableWidth + 20,
        minY: tableY, // Start at header, not above
        maxY: tableY + tableHeight + 20,
      });
    }
  }

  // SECOND PASS: detect individual field labels (but skip if in table region)
  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const { x, y: rawY } = txToXY(item.transform);
    const y = flipY(rawY, height);
    const text = item.str.trim();

    if (!text) continue;

    // Skip if this is in a table region
    if (isInTableRegion(x, y, tableRegions)) {
      continue;
    }

    // Be more selective about what constitutes a form label
    const endsWithLabelChar = text.endsWith(":") || text.endsWith(".");
    const isReasonablyShort = text.length < 60; // Increased from 50
    const hasFormKeywords =
      /\b(from|to|name|date|number|invoice|amount|address|phone|email|city|state|zip|due|subtotal|tax|total)\b/i.test(
        text,
      );

    // More lenient: label if ends with : or . AND (is short OR has keywords)
    const isLabel =
      item.width < MIN_LABEL_WIDTH * 5 &&
      endsWithLabelChar &&
      (isReasonablyShort || hasFormKeywords);

    if (isLabel && text.length > 1) {
      const label = text.replace(/[:.]$/, "").trim();
      const normalizedLabel = label.toLowerCase();

      // Check if we've already seen this exact label
      const existingLabelPos = seenLabels.get(normalizedLabel);
      if (existingLabelPos) {
        // Skip if very close to existing label position (same field detected twice)
        // Be more lenient vertically to allow stacked fields
        if (
          Math.abs(existingLabelPos.x - x) < 30 &&
          Math.abs(existingLabelPos.y - y) < 5
        ) {
          continue;
        }
      }

      const slotX = x + item.width + 4;
      const slotY = y;

      // Skip if slot position would be in table region
      if (isInTableRegion(slotX, slotY, tableRegions)) {
        continue;
      }

      // Width heuristic
      let slotWidth = width - slotX - 10;
      for (let j = i + 1; j < sorted.length; j++) {
        const next = sorted[j];
        const { x: nx, y: nRawY } = txToXY(next.transform);
        const ny = flipY(nRawY, height);
        if (Math.abs(ny - y) < LABEL_FIELD_PROXIMITY && nx > slotX) {
          slotWidth = Math.min(slotWidth, nx - slotX - 4);
          break;
        }
      }

      const fieldType = classifyField(label);
      const fieldHeight = DEFAULT_FIELD_HEIGHT;
      const isMultiline = shouldBeMultiline(label);

      const bbox: BoundingBox = {
        x: slotX,
        y: slotY,
        width: Math.max(slotWidth, 60),
        height: fieldHeight,
      };

      // Skip if would overlap with existing fields
      if (
        wouldOverlapWithExistingFields(
          slotX,
          slotY,
          bbox.width,
          bbox.height,
          fieldSlots,
        )
      ) {
        continue;
      }

      const id = makeSlotId(rawPage.pageNumber, slotX, slotY, label);

      if (!seenIds.has(id)) {
        seenIds.add(id);
        seenLabels.set(normalizedLabel, { x, y });

        fieldSlots.push({
          id,
          label,
          type: fieldType,
          bbox,
          pageNumber: rawPage.pageNumber,
          multiline: fieldType === "text" && isMultiline,
        });

        labelPositions.push({
          x,
          y,
          width: item.width,
          height: item.height || DEFAULT_FIELD_HEIGHT,
        });
      }
    }
  }

  // Second pass: Don't render static blocks for form labels
  // The MUI TextField components already show the label, so we don't need
  // to duplicate them as static blocks. This prevents clutter and overlap.
  // We could add other decorative elements here if needed (lines, boxes, etc.)

  // FINAL CLEANUP: Remove true duplicates (same label, overlapping positions)
  const uniqueFields: FieldSlot[] = [];
  const fieldsByLabel = new Map<string, FieldSlot[]>();

  for (const field of fieldSlots) {
    const normalizedLabel = field.label.toLowerCase();
    if (!fieldsByLabel.has(normalizedLabel)) {
      fieldsByLabel.set(normalizedLabel, []);
    }
    fieldsByLabel.get(normalizedLabel)!.push(field);
  }

  // For each label, only keep non-overlapping fields
  for (const [label, fields] of fieldsByLabel) {
    if (fields.length === 1) {
      uniqueFields.push(fields[0]);
    } else {
      // Keep the first one and only add others if they don't overlap
      uniqueFields.push(fields[0]);
      for (let i = 1; i < fields.length; i++) {
        const candidate = fields[i];
        const overlapsWithKept = uniqueFields.some((kept) => {
          const xOverlap =
            candidate.bbox.x < kept.bbox.x + kept.bbox.width &&
            candidate.bbox.x + candidate.bbox.width > kept.bbox.x;
          const yOverlap =
            candidate.bbox.y < kept.bbox.y + kept.bbox.height &&
            candidate.bbox.y + candidate.bbox.height > kept.bbox.y;
          return xOverlap && yOverlap;
        });
        if (!overlapsWithKept) {
          uniqueFields.push(candidate);
        }
      }
    }
  }

  return { width, height, fieldSlots: uniqueFields, staticBlocks };
}
