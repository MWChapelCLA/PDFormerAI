import React from 'react';
import Typography from '@mui/material/Typography';
import type { StaticBlock } from '../types';

interface Props {
  block: StaticBlock;
  scale?: number;
}

/**
 * Renders a non-editable PDF content block (text, decorative lines, etc.)
 * at its exact position within the page canvas.
 */
export const StaticBlockRenderer: React.FC<Props> = ({ block, scale = 1.5 }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: block.bbox.x * scale,
    top: block.bbox.y * scale,
    width: block.bbox.width * scale,
    height: block.bbox.height * scale,
  };

  if (block.kind === 'text' && block.content) {
    return (
      <Typography
        aria-hidden
        variant="caption"
        sx={{
          ...style,
          display: 'block',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          color: 'text.secondary',
          userSelect: 'none',
        }}
      >
        {block.content}
      </Typography>
    );
  }

  if (block.kind === 'line' || block.kind === 'rect') {
    return (
      <div
        aria-hidden
        style={{
          ...style,
          borderBottom: block.kind === 'line' ? '1px solid #ccc' : undefined,
          border: block.kind === 'rect' ? '1px solid #ccc' : undefined,
        }}
      />
    );
  }

  return null;
};
