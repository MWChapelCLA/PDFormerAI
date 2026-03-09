import React from "react";
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid";
import type { FieldSlot, TableData } from "../../types";

interface Props {
  slot: FieldSlot;
  value: TableData;
  onChange: (value: TableData) => void;
  readOnly?: boolean;
  scale?: number;
}

export const TableFieldRenderer: React.FC<Props> = ({
  slot,
  value,
  onChange,
  readOnly = false,
  scale = 1.5,
}) => {
  const rows: GridRowsProp = value.map((row, idx) => ({ id: idx, ...row }));

  // Derive columns from the first row's keys or slot options
  const keys =
    value.length > 0 ? Object.keys(value[0]) : (slot.options ?? ["value"]);

  const columns: GridColDef[] = keys.map((k) => ({
    field: k,
    headerName: k,
    flex: 1,
    editable: !readOnly,
  }));

  return (
    <div
      style={{
        position: "absolute",
        left: slot.bbox.x * scale,
        top: slot.bbox.y * scale,
        width: slot.bbox.width * scale,
        height: Math.max(slot.bbox.height * scale, 200),
        overflow: "hidden",
      }}
      aria-label={slot.label}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        density="compact"
        hideFooter={rows.length < 10}
        disableRowSelectionOnClick
        editMode="cell"
        processRowUpdate={(newRow) => {
          const { id, ...rest } = newRow as { id: number } & Record<
            string,
            string | number | boolean
          >;
          const updated = [...value];
          updated[id] = rest;
          onChange(updated);
          return newRow;
        }}
        onProcessRowUpdateError={(error) => {
          console.error("Table update error:", error);
        }}
        sx={{
          fontSize: "0.7rem",
          "& .MuiDataGrid-cell": {
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: "0.7rem",
            padding: "2px 4px",
          },
          "& .MuiDataGrid-columnHeader": {
            fontSize: "0.7rem",
            padding: "2px 4px",
          },
          "& .MuiDataGrid-cell--editable": {
            cursor: "pointer",
          },
        }}
      />
    </div>
  );
};
