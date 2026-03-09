import React from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import type { FieldSlot } from "../../types";

interface Props {
  slot: FieldSlot;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  scale?: number;
}

export const SelectFieldRenderer: React.FC<Props> = ({
  slot,
  value,
  onChange,
  readOnly = false,
  scale = 1.5,
}) => {
  const options = slot.options ?? [];

  return (
    <FormControl
      size="small"
      disabled={readOnly}
      sx={{
        position: "absolute",
        left: slot.bbox.x * scale,
        top: slot.bbox.y * scale,
        width: slot.bbox.width * scale,
        "& .MuiSelect-select": {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "0.75rem",
          padding: "4px 8px",
        },
        "& .MuiInputLabel-root": {
          fontSize: "0.75rem",
        },
      }}
    >
      <InputLabel style={{ fontSize: "0.75rem" }}>{slot.label}</InputLabel>
      <Select
        value={value}
        label={slot.label}
        onChange={(e: SelectChangeEvent) => onChange(e.target.value)}
        inputProps={{ "aria-label": slot.label }}
        sx={{ fontSize: "0.75rem" }}
      >
        {options.map((opt) => (
          <MenuItem key={opt} value={opt} sx={{ fontSize: "0.75rem" }}>
            {opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
