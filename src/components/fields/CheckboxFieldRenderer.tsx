import React from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import type { FieldSlot } from "../../types";

interface Props {
  slot: FieldSlot;
  value: boolean;
  onChange: (value: boolean) => void;
  readOnly?: boolean;
  scale?: number;
}

export const CheckboxFieldRenderer: React.FC<Props> = ({
  slot,
  value,
  onChange,
  readOnly = false,
  scale = 1.5,
}) => {
  return (
    <FormControlLabel
      label={slot.label}
      disabled={readOnly}
      control={
        <Checkbox
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          size="small"
          inputProps={{ "aria-label": slot.label }}
        />
      }
      sx={{
        position: "absolute",
        left: slot.bbox.x * scale,
        top: slot.bbox.y * scale,
        width: slot.bbox.width * scale,
        margin: 0,
        overflow: "hidden",
        "& .MuiFormControlLabel-label": {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "0.75rem",
        },
      }}
    />
  );
};
