import React from 'react';
import MuiTextField from '@mui/material/TextField';
import type { FieldSlot } from '../../types';

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
  return (
    <MuiTextField
      size="small"
      variant="outlined"
      value={value}
      label={slot.label}
      onChange={(e) => onChange(e.target.value)}
      disabled={readOnly}
      inputProps={{ 'aria-label': slot.label }}
      sx={{
        position: 'absolute',
        left: slot.bbox.x * scale,
        top: slot.bbox.y * scale,
        width: slot.bbox.width * scale,
      }}
    />
  );
};
