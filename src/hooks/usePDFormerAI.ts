import { useReducer, useCallback, useMemo } from "react";
import type {
  PDFLayout,
  ExtractedFormData,
  BoundField,
  FieldValue,
  UsePDFormerAIResult,
} from "../types";
import { bindLayoutToData } from "../utils/bindLayoutToData";
import { normalizeLayout } from "../utils/normalizeLayout";

type State = {
  boundFields: BoundField[];
};

type Action = {
  type: "UPDATE_FIELD";
  slotId: string;
  value: FieldValue;
};

function reducer(state: State, action: Action): State {
  if (action.type === "UPDATE_FIELD") {
    return {
      boundFields: state.boundFields.map((bf) =>
        bf.slot.id === action.slotId ? { ...bf, value: action.value } : bf,
      ),
    };
  }
  return state;
}

/**
 * Headless hook — manages form state for a PDF layout + extracted data pair.
 *
 * Useful when you want to render your own UI on top of the binding logic
 * without using PDFormerAIEditor directly.
 */
export function usePDFormerAI(
  layout: PDFLayout,
  extractedData: ExtractedFormData,
): UsePDFormerAIResult {
  // Normalize layout for compact, left-aligned display
  const normalizedLayout = useMemo(() => normalizeLayout(layout), [layout]);

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    boundFields: bindLayoutToData(normalizedLayout, extractedData),
  }));

  const updateField = useCallback((slotId: string, value: FieldValue) => {
    dispatch({ type: "UPDATE_FIELD", slotId, value });
  }, []);

  const getFormData = useCallback((): ExtractedFormData => {
    return Object.fromEntries(
      state.boundFields
        .filter((bf) => bf.editable)
        .map((bf) => [bf.slot.id, bf.value]),
    );
  }, [state.boundFields]);

  return {
    boundFields: state.boundFields,
    updateField,
    getFormData,
  };
}
