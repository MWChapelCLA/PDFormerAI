# PDFormerAI Example App

This example demonstrates how to use PDFormerAI to extract data from PDF forms and display an interactive editor.

## Features

- **Split-pane interface**: PDF viewer on the left, interactive form on the right
- **Azure OpenAI integration**: Uses Azure OpenAI to extract form data
- **Live editing**: Edit extracted data in real-time with MUI components
- **Save functionality**: Save form data via API callback

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure Azure OpenAI**:

   Copy `.env.example` to `.env` and fill in your Azure OpenAI credentials:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:

   ```env
   AZURE_OPENAI_API_KEY=your-api-key-here
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_DEPLOYMENT_ID=gpt-4o-ncus
   AZURE_OPENAI_API_VERSION=2024-08-01-preview
   ```

3. **Build the main package** (from the root directory):
   ```bash
   cd ..
   npm run build
   cd examples
   ```

## Running the Example

Start both the API server and the React app:

```bash
npm run dev
```

This will start:

- **API Server**: http://localhost:3050 (or next available port)
- **React App**: http://localhost:3055 (or next available port)

Open http://localhost:3055 in your browser.

> **Note**: If the default ports are in use, both the server and Vite will automatically find the next available port. If the API server starts on a different port, you'll see a warning message with instructions to update the Vite proxy configuration.

## How It Works

### Architecture

1. **Backend API** (`server/index.ts`):
   - `POST /api/extract` - Accepts PDF file, returns extraction result
   - `GET /api/pdfs` - Lists sample PDFs
   - `GET /api/pdfs/:filename` - Serves sample PDF
   - `POST /api/save` - Receives saved form data

2. **Frontend** (`src/App.tsx`):
   - PDF selector and loader
   - Split-pane view with PDF on left, form on right
   - Uses `PDFormerAIEditor` component from the library

### Usage Flow

1. Select a PDF from the dropdown
2. Click "Load & Extract"
3. The app:
   - Fetches the PDF file
   - Sends it to `/api/extract`
   - Server calls `extractPDFSchemaData()` with Azure OpenAI config
   - Returns `{ layout, extractedData }`
   - App displays PDF and editable form side-by-side
4. Edit the form fields
5. Click "Save" to persist changes

## Sample PDFs

The example includes sample PDFs in the examples directory:

- `invoice.pdf`
- `W2.pdf`

## API Endpoints

### POST /api/extract

Extract data from a PDF using Azure OpenAI.

**Request**: multipart/form-data with PDF file

**Response**:

```json
{
  "layout": {
    "pageCount": 1,
    "pages": [...]
  },
  "extractedData": {
    "field_id_1": "value1",
    "field_id_2": "value2"
  }
}
```

### POST /api/save

Save form data.

**Request**:

```json
{
  "filename": "invoice.pdf",
  "data": {
    "field_id_1": "updated_value"
  }
}
```

**Response**:

```json
{
  "success": true,
  "message": "Form data saved successfully"
}
```

## Using Different OpenAI Providers

### Azure OpenAI (default)

```typescript
import { extractPDFSchemaData, configFromEnv } from "pdformerai";

const config = configFromEnv(true); // true = Azure
const result = await extractPDFSchemaData(pdfBuffer, config);
```

### Standard OpenAI

```typescript
const config = configFromEnv(false); // false = Standard OpenAI
const result = await extractPDFSchemaData(pdfBuffer, config);
```

### Custom Configuration

```typescript
import { extractPDFSchemaData } from "pdformerai";

const result = await extractPDFSchemaData(pdfBuffer, {
  apiKey: "your-key",
  endpoint: "your-endpoint",
  model: "gpt-4o",
  isAzure: true,
  azureApiVersion: "2024-08-01-preview",
});
```

## Customization

### Change PDF Scale

```tsx
<PDFormerAIEditor
  layout={result.layout}
  extractedData={result.extractedData}
  scale={1.5} // Adjust scale
  onSave={handleSave}
/>
```

### Read-only Mode

```tsx
<PDFormerAIEditor
  layout={result.layout}
  extractedData={result.extractedData}
  readOnly={true}
/>
```

### Custom Save Button Label

```tsx
<PDFormerAIEditor
  layout={result.layout}
  extractedData={result.extractedData}
  saveLabel="Submit Form"
  onSave={handleSave}
/>
```
