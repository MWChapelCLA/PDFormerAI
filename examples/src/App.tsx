import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Paper,
  AppBar,
  Toolbar,
} from "@mui/material";
import { PDFormerAIEditor } from "pdformerai";
import type { ExtractionResult, ExtractedFormData } from "pdformerai";

function App() {
  const [pdfList, setPdfList] = useState<string[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [extractionResult, setExtractionResult] =
    useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<string>("");

  // Load available PDFs on mount
  useEffect(() => {
    fetch("/api/pdfs")
      .then((res) => res.json())
      .then((data) => {
        setPdfList(data.pdfs);
        if (data.pdfs.length > 0) {
          setSelectedPdf(data.pdfs[0]);
        }
      })
      .catch((err) => setError("Failed to load PDF list"));
  }, []);

  // Handle PDF selection
  const handleLoadPdf = async () => {
    if (!selectedPdf) return;

    setLoading(true);
    setError("");
    setSaveStatus("");
    setExtractionResult(null);

    try {
      // Fetch the PDF file
      const pdfResponse = await fetch(`/api/pdfs/${selectedPdf}`);
      if (!pdfResponse.ok) {
        throw new Error("Failed to load PDF");
      }

      const pdfBlob = await pdfResponse.blob();

      // Set PDF URL for viewer
      setPdfUrl(URL.createObjectURL(pdfBlob));

      // Send to extraction API
      const formData = new FormData();
      formData.append("pdf", pdfBlob, selectedPdf);

      const extractResponse = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.message || "Extraction failed");
      }

      const result: ExtractionResult = await extractResponse.json();
      setExtractionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handle save callback from the editor
  const handleSave = async (data: ExtractedFormData) => {
    setSaveStatus("Saving...");

    try {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: selectedPdf,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      const result = await response.json();
      setSaveStatus("✓ Saved successfully!");
      console.log("Saved data:", result.savedData);

      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (err) {
      setSaveStatus("✗ Save failed");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            PDFormerAI Example
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ mt: 3, mb: 3 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <FormControl sx={{ minWidth: 300 }}>
              <InputLabel>Select PDF</InputLabel>
              <Select
                value={selectedPdf}
                label="Select PDF"
                onChange={(e) => setSelectedPdf(e.target.value)}
              >
                {pdfList.map((pdf) => (
                  <MenuItem key={pdf} value={pdf}>
                    {pdf}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleLoadPdf}
              disabled={!selectedPdf || loading}
            >
              {loading ? "Processing..." : "Load & Extract"}
            </Button>

            {saveStatus && (
              <Typography
                color={saveStatus.includes("✓") ? "success.main" : "error.main"}
              >
                {saveStatus}
              </Typography>
            )}
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {extractionResult && pdfUrl && (
          <Box sx={{ display: "flex", gap: 3, minHeight: "70vh" }}>
            {/* PDF Viewer - Left Side */}
            <Paper
              sx={{
                flex: 1,
                p: 2,
                overflow: "auto",
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Original PDF
              </Typography>
              <iframe
                src={pdfUrl}
                style={{
                  width: "100%",
                  minHeight: "700px",
                  border: "none",
                }}
                title="PDF Viewer"
              />
            </Paper>

            {/* Form Editor - Right Side */}
            <Paper
              sx={{
                flex: 1,
                p: 2,
                overflow: "auto",
                maxHeight: "80vh",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Extracted Form
              </Typography>
              <PDFormerAIEditor
                layout={extractionResult.layout}
                extractedData={extractionResult.extractedData}
                onSave={handleSave}
                scale={1.2}
              />
            </Paper>
          </Box>
        )}
      </Container>
    </>
  );
}

export default App;
