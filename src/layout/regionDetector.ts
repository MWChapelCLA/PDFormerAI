import type { FieldSlot, StaticBlock, BoundingBox, PDFPageLayout } from '../types';
import type { RawPageData } from './pdfReader';
import { classifyField } from './fieldClassifier';

/** Minimum width (pts) for a text item to be considered a label */
const MIN_LABEL_WIDTH = 20;
/** Max vertical distance (pts) between a label and its field slot */
const LABEL_FIELD_PROXIMITY = 20;
/** Typical height (pts) assumed for a single-line input slot */
const DEFAULT_FIELD_HEIGHT = 14;
/** Minimum text width to consider as a standalone text block (not a label) */
const STATIC_TEXT_MIN_WIDTH = 60;

/** Build a stable slot ID from page + position */
function makeSlotId(page: number, x: number, y: number, label: string): string {
  const sanitized = label.replace(/\W+/g, '_').slice(0, 24).toLowerCase();
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

/**
 * Detect field slots and static blocks from raw pdfjs text items.
 *
 * Strategy:
 *  1. Walk text items sorted by Y position (top-to-bottom).
 *  2. Items that are short and end with ':' or '-' are treated as labels.
 *  3. The field slot is placed immediately to the right of (or below) that label.
 *  4. Items that are long / don't match label patterns become StaticBlocks.
 */
export function detectRegions(rawPage: RawPageData): Omit<PDFPageLayout, 'pageNumber'> {
  const { textItems, width, height } = rawPage;

  const fieldSlots: FieldSlot[] = [];
  const staticBlocks: StaticBlock[] = [];

  // Sort items top-to-bottom, left-to-right
  const sorted = [...textItems].sort((a, b) => {
    const ay = flipY(txToXY(a.transform).y, height);
    const by = flipY(txToXY(b.transform).y, height);
    if (Math.abs(ay - by) < 4) return txToXY(a.transform).x - txToXY(b.transform).x;
    return ay - by;
  });

  const seenIds = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const { x, y: rawY } = txToXY(item.transform);
    const y = flipY(rawY, height);
    const text = item.str.trim();

    if (!text) continue;

    const isLabel =
      item.width < MIN_LABEL_WIDTH * 4 &&
      (text.endsWith(':') || text.endsWith('.') || text.length < 30);

    if (isLabel && text.length > 1) {
      // Look for a nearby item to the right or on the next line to serve as value area
      const slotX = x + item.width + 4;
      const slotY = y;

      // Width heuristic: span to the next label or page edge
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

      const bbox: BoundingBox = {
        x: slotX,
        y: slotY,
        width: Math.max(slotWidth, 60),
        height: DEFAULT_FIELD_HEIGHT,
      };

      const label = text.replace(/:$/, '').trim();
      const id = makeSlotId(rawPage.pageNumber, slotX, slotY, label);

      if (!seenIds.has(id)) {
        seenIds.add(id);
        fieldSlots.push({
          id,
          label,
          type: classifyField(label),
          bbox,
          pageNumber: rawPage.pageNumber,
        });
      }
    } else if (item.width >= STATIC_TEXT_MIN_WIDTH || text.length > 4) {
      // Treat as static content
      staticBlocks.push({
        kind: 'text',
        content: text,
        bbox: {
          x,
          y,
          width: item.width,
          height: item.height || DEFAULT_FIELD_HEIGHT,
        },
        pageNumber: rawPage.pageNumber,
      });
    }
  }

  return { width, height, fieldSlots, staticBlocks };
}
