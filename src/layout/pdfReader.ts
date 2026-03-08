import type { PDFPageLayout, PDFLayout } from '../types';

interface RawTextItem {
  str: string;
  transform: number[]; // [scaleX, skewX, skewY, scaleY, x, y]
  width: number;
  height: number;
}

export interface RawPageData {
  pageNumber: number;
  width: number;
  height: number;
  textItems: RawTextItem[];
}

/**
 * Extracts raw text items with positions from each page of a PDF buffer.
 * Uses pdfjs-dist, which works in both Node.js and browser environments.
 */
export async function readPDFPages(
  buffer: ArrayBuffer | Buffer,
): Promise<RawPageData[]> {
  // pdfjs-dist is isomorphic; use the legacy build for Node.js compat
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js') as typeof import('pdfjs-dist');

  // Disable the worker in Node.js — let it run on the main thread
  // @ts-expect-error: NodeCanvasFactory is not in types
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const data = buffer instanceof ArrayBuffer ? buffer : buffer.buffer;
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const pages: RawPageData[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const textItems: RawTextItem[] = textContent.items
      .filter((item): item is import('pdfjs-dist/types/src/display/api').TextItem =>
        'str' in item,
      )
      .map((item) => ({
        str: item.str,
        transform: item.transform as number[],
        width: item.width,
        height: item.height ?? 10,
      }));

    pages.push({
      pageNumber: pageNum,
      width: viewport.width,
      height: viewport.height,
      textItems,
    });
  }

  return pages;
}
