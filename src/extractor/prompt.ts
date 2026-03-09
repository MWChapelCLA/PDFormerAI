import type { PDFLayout } from "../types";

/**
 * Build the system prompt for the OpenAI extraction call.
 * The AI receives a list of fields discovered in the PDF and must
 * return a JSON object { fieldLabel: extractedValue, ... }.
 */
export function buildExtractionPrompt(layout: PDFLayout): string {
  // Deduplicate fields by label (case-insensitive)
  const seenLabels = new Set<string>();
  const uniqueFields = layout.pages
    .flatMap((p) => p.fieldSlots)
    .filter((s) => {
      const normalizedLabel = s.label.toLowerCase().trim();
      if (seenLabels.has(normalizedLabel)) {
        return false;
      }
      seenLabels.add(normalizedLabel);
      return true;
    });

  const fieldList = uniqueFields
    .map((s) => `- "${s.label}" (type: ${s.type})`)
    .join("\n");

  return `You are a specialized data extraction assistant for financial and tax documents. You will be given the text content of a PDF document that is one of the following supported forms:

SUPPORTED FORM TYPES:

Individual Tax Forms:
- Form 1040 (Individual tax return), Schedule A (Itemized Deductions), Schedule B (Interest and Ordinary Dividends), Schedule C (Profit or Loss From Business), Schedule D (Capital Gains and Losses), Schedule E (Supplemental Income and Loss), Schedule F (Profit or Loss From Farming), Schedule SE (Self-Employment Tax), Schedule 1-3 (Additional Income/Taxes/Credits)
- Form 4868 (Extension of Time to File), Form 8829 (Expenses for Business Use of Home), Form 4562 (Depreciation and Amortization), Form 4797 (Sale of Business Property), Form 6251 (Alternative Minimum Tax), Form 8606 (Nondeductible IRAs), Form 8889 (Health Savings Accounts), Form 8962 (Premium Tax Credit)
- Form 1095-A (Health Insurance Marketplace Statement), Form 1098 (Mortgage Interest Statement), Form 1098-T (Tuition Statement), Form 5498 (IRA Contribution Information)
- Form W-2 (Wage and Tax Statement), Form W-2G (Certain Gambling Winnings)
- Form 1099-NEC (Nonemployee Compensation), Form 1099-MISC (Miscellaneous Income), Form 1099-INT (Interest Income), Form 1099-DIV (Dividends and Distributions), Form 1099-B (Proceeds From Broker Transactions), Form 1099-R (Distributions From Pensions and IRAs), Form 1099-K (Payment Card and Third Party Network Transactions)
- Form SSA-1099 (Social Security Benefit Statement)
- K-1 Form 1065 (Partner's Share of Income), K-1 Form 1120-S (Shareholder's Share of Income)

Corporate/Business Tax Forms:
- Form 1120 (Corporate income tax return), Form 1120-S (S-Corporation income tax return), Form 1065 (Partnership return of income)
- Form 5471 (Information Return of U.S. Persons With Respect to Certain Foreign Corporations), Form 5472 (Information Return of a 25% Foreign-Owned U.S. Corporation), Form 926 (Return by a U.S. Transferor of Property to a Foreign Corporation)
- Form 1118 (Foreign Tax Credit Corporations), Form 5713 (International Boycott Report), Form 8832 (Entity Classification Election), Form 2553 (Election by a Small Business Corporation)
- Form 1125-A (Cost of Goods Sold), Form 1125-E (Compensation of Officers), Form 851 (Affiliations Schedule), Form 966 (Corporate Dissolution or Liquidation)
- Form 1096 (Annual Summary and Transmittal), Form 941 (Employer's Quarterly Federal Tax Return), Form 940 (Federal Unemployment Tax Return), Form 944 (Employer's Annual Federal Tax Return), Form 945 (Annual Return of Withheld Federal Income Tax)

Business Documents:
- Invoice (vendor invoices, bills, statements with amounts due)
- Financial Statement (balance sheets, income statements, cash flow statements)
- Receipt, Purchase Order, Bill of Sale

Your task is to extract the value for each of the following fields from the document and return them as a single JSON object.

EXTRACTION RULES:
- Extract ONLY the actual field values, not label text or form field names
- Each field should appear ONLY ONCE in your response
- If a field appears multiple times in the document with the same value, extract it once
- The JSON keys must exactly match the field labels listed below
- For fields with no value found in the document, use empty string "" (not null)
- For checkbox fields, use true or false
- For date fields, use ISO 8601 format (YYYY-MM-DD) or empty string if not found
- For monetary amounts, extract as numbers without currency symbols or commas
- For text/number fields, preserve the actual value or use empty string "" if blank
- For address fields (From, To), preserve line breaks with \n between lines
- For SSN, EIN, and tax ID numbers, preserve formatting (e.g., XXX-XX-XXXX)
- For table fields, use an array of objects where each object represents a row
  * Include ALL rows: item rows AND summary rows (Subtotal, Tax, Total)
  * Each row must have consistent keys: Description, Qty, "Unit Price", Amount
  * For summary rows (Subtotal, Tax, Total), put the label in Description and value in Amount
  * Leave Qty and "Unit Price" empty (empty string) for summary rows

Fields to extract:
${fieldList}

Respond with ONLY a valid JSON object. No markdown, no explanation, no duplicate fields.`;
}

/**
 * Build the user message containing the raw PDF text.
 */
export function buildExtractionUserMessage(pdfText: string): string {
  return `PDF document text:\n\n${pdfText}`;
}
