import express from "express";
import cors from "cors";
import multer from "multer";
import { promises as fs } from "fs";
import path from "path";
import dotenv from "dotenv";
import { createServer } from "http";
import { extractPDFSchemaData, configFromEnv } from "pdformerai";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
let PORT = parseInt(process.env.PORT || "3050", 10);

app.use(cors());
app.use(express.json());

/**
 * POST /api/extract
 * Accepts a PDF file and returns the extraction result (layout + data)
 */
app.post("/api/extract", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    console.log(`Extracting PDF: ${req.file.originalname}`);

    // Get Azure OpenAI config from environment
    const config = configFromEnv(true);

    // Extract layout and data
    const result = await extractPDFSchemaData(req.file.buffer, config);

    console.log(
      `Extraction complete: ${result.layout.pages.length} pages, ${result.layout.pages.reduce((sum, p) => sum + p.fieldSlots.length, 0)} fields`,
    );

    res.json(result);
  } catch (error) {
    console.error("Extraction error:", error);
    res.status(500).json({
      error: "Failed to extract PDF",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/pdfs
 * Returns list of sample PDFs available in the examples directory
 */
app.get("/api/pdfs", async (req, res) => {
  try {
    const files = await fs.readdir(__dirname + "/..");
    const pdfFiles = files.filter((f) => f.endsWith(".pdf"));
    res.json({ pdfs: pdfFiles });
  } catch (error) {
    res.status(500).json({ error: "Failed to list PDFs" });
  }
});

/**
 * GET /api/pdfs/:filename
 * Serves a sample PDF file
 */
app.get("/api/pdfs/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;

    // Security: only allow PDF files and prevent directory traversal
    if (!filename.endsWith(".pdf") || filename.includes("..")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const filepath = path.join(__dirname, "..", filename);
    const buffer = await fs.readFile(filepath);

    res.contentType("application/pdf");
    res.send(buffer);
  } catch (error) {
    res.status(404).json({ error: "PDF not found" });
  }
});

/**
 * POST /api/save
 * Receives form data from the editor
 */
app.post("/api/save", async (req, res) => {
  try {
    const { filename, data } = req.body;

    console.log(`Saving form data for ${filename}:`);
    console.log(JSON.stringify(data, null, 2));

    // In a real app, you would save this to a database
    // For now, just log it and return success

    res.json({
      success: true,
      message: "Form data saved successfully",
      savedData: data,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to save form data" });
  }
});

/**
 * Attempts to start the server on the specified port.
 * If the port is in use, tries the next available port.
 */
function startServer(port: number) {
  const server = createServer(app);

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${port} is in use, trying ${port + 1}...`);
      server.close();
      startServer(port + 1);
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    PORT = port;
    console.log(`\n✓ Server running on http://localhost:${PORT}`);

    if (port !== parseInt(process.env.PORT || "3050", 10)) {
      console.log(
        `\n⚠️  Note: Server started on port ${port} (default was in use)`,
      );
      console.log(
        `   Update vite.config.ts proxy target to: http://localhost:${port}`,
      );
    }

    console.log(`\nAPI endpoints:`);
    console.log(`  POST /api/extract - Extract data from uploaded PDF`);
    console.log(`  GET  /api/pdfs - List sample PDFs`);
    console.log(`  GET  /api/pdfs/:filename - Get sample PDF`);
    console.log(`  POST /api/save - Save form data`);
    console.log(`\nPress Ctrl+C to stop\n`);
  });
}

startServer(PORT);
