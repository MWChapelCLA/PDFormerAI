import React from "react";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import type { FieldSlot } from "../../types";

interface Props {
  slot: FieldSlot;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  scale?: number;
}

export const RadioFieldRenderer: React.FC<Props> = ({
  slot,
  value,
  onChange,
  readOnly = false,
  scale = 1.5,
}) => {
  const options = slot.options ?? [];

  return (
    <FormControl
      disabled={readOnly}
      sx={{
        position: "absolute",
        left: slot.bbox.x * scale,
        top: slot.bbox.y * scale,
        width: slot.bbox.width * scale,
        overflow: "hidden",
      }}
    >
      <FormLabel
        sx={{
          fontSize: "0.65rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {slot.label}
      </FormLabel>
      <RadioGroup
        row
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={slot.label}
        sx={{
          overflow: "hidden",
          "& .MuiFormControlLabel-label": {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "0.7rem",
          },
        }}
      >
        {options.map((opt) => (
          <FormControlLabel
            key={opt}
            value={opt}
            label={opt}
            control={<Radio size="small" />}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};
