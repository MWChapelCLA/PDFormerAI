import type { PDFLayout } from '../types';
import { readPDFPages } from './pdfReader';
import { detectRegions } from './regionDetector';

/**
 * Parses a PDF buffer and returns a PDFLayout describing the visual structure
 * of every page: field slot positions, labels, inferred types, and static content.
 *
 * This does NOT extract values — see IFormDataExtractor for that.
 *
 * @param buffer  ArrayBuffer (browser) or Buffer (Node.js)
 */
export async function extractPDFLayout(
  buffer: ArrayBuffer | Buffer,
): Promise<PDFLayout> {
  const rawPages = await readPDFPages(buffer);

  const pages = rawPages.map((raw) => {
    const regions = detectRegions(raw);
    return {
      pageNumber: raw.pageNumber,
      width: regions.width,
      height: regions.height,
      fieldSlots: regions.fieldSlots,
      staticBlocks: regions.staticBlocks,
    };
  });

  return {
    pageCount: pages.length,
    pages,
  };
}

export type { PDFLayout } from '../types';
