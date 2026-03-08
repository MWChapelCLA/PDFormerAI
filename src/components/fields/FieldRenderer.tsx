import React from 'react';
import type { BoundField, FieldValue, TableData } from '../../types';
import { TextFieldRenderer } from './TextFieldRenderer';
import { NumberFieldRenderer } from './NumberFieldRenderer';
import { DateFieldRenderer } from './DateFieldRenderer';
import { SelectFieldRenderer } from './SelectFieldRenderer';
import { CheckboxFieldRenderer } from './CheckboxFieldRenderer';
import { RadioFieldRenderer } from './RadioFieldRenderer';
import { TableFieldRenderer } from './TableFieldRenderer';

interface Props {
  boundField: BoundField;
  onChange: (slotId: string, value: FieldValue) => void;
  readOnly?: boolean;
  scale?: number;
}

/**
 * Dispatches to the correct field renderer based on slot.type.
 * If the field is not editable (no extracted data), renders a read-only text display.
 */
export const FieldRenderer: React.FC<Props> = ({
  boundField,
  onChange,
  readOnly = false,
  scale = 1.5,
}) => {
  const { slot, value, editable } = boundField;
  const isReadOnly = readOnly || !editable;

  const handleChange = (v: FieldValue) => onChange(slot.id, v);

  switch (slot.type) {
    case 'text':
      return (
        <TextFieldRenderer
          slot={slot}
          value={String(value ?? '')}
          onChange={(v) => handleChange(v)}
          readOnly={isReadOnly}
          scale={scale}
        />
      );

    case 'number':
      return (
        <NumberFieldRenderer
          slot={slot}
          value={value as string | number}
          onChange={(v) => handleChange(v)}
          readOnly={isReadOnly}
          scale={scale}
        />
      );

    case 'date':
      return (
        <DateFieldRenderer
          slot={slot}
          value={String(value ?? '')}
          onChange={(v) => handleChange(v)}
          readOnly={isReadOnly}
          scale={scale}
        />
      );

    case 'select':
      return (
        <SelectFieldRenderer
          slot={slot}
          value={String(value ?? '')}
          onChange={(v) => handleChange(v)}
          readOnly={isReadOnly}
          scale={scale}
        />
      );

    case 'checkbox':
      return (
        <CheckboxFieldRenderer
          slot={slot}
          value={Boolean(value)}
          onChange={(v) => handleChange(v)}
          readOnly={isReadOnly}
          scale={scale}
        />
      );

    case 'radio':
      return (
        <RadioFieldRenderer
          slot={slot}
          value={String(value ?? '')}
          onChange={(v) => handleChange(v)}
          readOnly={isReadOnly}
          scale={scale}
        />
      );

    case 'table':
      return (
        <TableFieldRenderer
          slot={slot}
          value={(value as TableData) ?? []}
          onChange={(v) => handleChange(v)}
          readOnly={isReadOnly}
          scale={scale}
        />
      );

    default:
      return null;
  }
};
