import React from "react";
import MuiTextField from "@mui/material/TextField";
import type { FieldSlot } from "../../types";

interface Props {
  slot: FieldSlot;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  scale?: number;
}

export const TextFieldRenderer: React.FC<Props> = ({
  slot,
  value,
  onChange,
  readOnly = false,
  scale = 1.5,
}) => {
  const isMultiline = slot.multiline || false;

  return (
    <MuiTextField
      size="small"
      variant="outlined"
      value={value}
      label={slot.label}
      onChange={(e) => onChange(e.target.value)}
      disabled={readOnly}
      multiline={isMultiline}
      rows={isMultiline ? 3 : 1}
      minRows={isMultiline ? 2 : 1}
      maxRows={isMultiline ? 5 : 1}
      inputProps={{
        "aria-label": slot.label,
        style: {
          overflow: isMultiline ? "auto" : "hidden",
          textOverflow: isMultiline ? "clip" : "ellipsis",
          fontSize: "0.75rem",
          padding: "4px 8px",
        },
      }}
      InputLabelProps={{
        style: { fontSize: "0.75rem" },
      }}
      sx={{
        position: "absolute",
        left: slot.bbox.x * scale,
        top: slot.bbox.y * scale,
        width: slot.bbox.width * scale,
        minHeight: isMultiline ? 80 : "auto",
        "& .MuiOutlinedInput-root": {
          fontSize: "0.75rem",
          height: isMultiline ? "auto" : "auto",
        },
        "& .MuiInputBase-input": {
          overflow: isMultiline ? "auto" : "hidden",
          textOverflow: isMultiline ? "clip" : "ellipsis",
          whiteSpace: isMultiline ? "pre-wrap" : "nowrap",
          fontSize: "0.75rem",
          padding: "6px 8px",
        },
      }}
    />
  );
};
