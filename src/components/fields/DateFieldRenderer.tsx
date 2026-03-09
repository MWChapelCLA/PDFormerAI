import React from "react";
import MuiTextField from "@mui/material/TextField";
import type { FieldSlot } from "../../types";

interface Props {
  slot: FieldSlot;
  /** ISO 8601 date string: YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  scale?: number;
}

export const DateFieldRenderer: React.FC<Props> = ({
  slot,
  value,
  onChange,
  readOnly = false,
  scale = 1.5,
}) => {
  return (
    <MuiTextField
      size="small"
      variant="outlined"
      type="date"
      value={value}
      label={slot.label}
      onChange={(e) => onChange(e.target.value)}
      disabled={readOnly}
      InputLabelProps={{
        shrink: true,
        style: { fontSize: "0.75rem" },
      }}
      inputProps={{
        "aria-label": slot.label,
        style: {
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontSize: "0.75rem",
          padding: "4px 8px",
        },
      }}
      sx={{
        position: "absolute",
        left: slot.bbox.x * scale,
        top: slot.bbox.y * scale,
        width: slot.bbox.width * scale,
        "& .MuiOutlinedInput-root": {
          overflow: "hidden",
          fontSize: "0.75rem",
        },
        "& .MuiInputBase-input": {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "0.75rem",
          padding: "4px 8px",
        },
      }}
    />
  );
};
