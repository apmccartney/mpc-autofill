import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "@/app/store";
import { Faces, InvalidIdentifiersState, SearchQuery } from "@/common/types";

//# region slice configuration

const initialState: InvalidIdentifiersState = { invalidIdentifiers: [] };

export const invalidIdentifiersSlice = createSlice({
  name: "invalidIdentifiers",
  initialState,
  reducers: {
    recordInvalidIdentifier: (
      state,
      action: PayloadAction<{
        slot: number;
        face: Faces;
        searchQuery: SearchQuery | undefined;
        identifier: string;
      }>
    ) => {
      const { slot, face, searchQuery, identifier } = action.payload;
      state.invalidIdentifiers[slot] = {
        ...(state.invalidIdentifiers[slot] ?? { front: null, back: null }),
        [face]: [searchQuery, identifier],
      };
    },
    clearInvalidIdentifier: (
      state,
      action: PayloadAction<{ slot: number; face: Faces }>
    ) => {
      state.invalidIdentifiers[action.payload.slot] = {
        ...state.invalidIdentifiers[action.payload.slot],
        [action.payload.face]: undefined,
      };
    },
    clearInvalidIdentifiers: (state) => {
      state.invalidIdentifiers = [];
    },
  },
});

export default invalidIdentifiersSlice.reducer;
export const {
  recordInvalidIdentifier,
  clearInvalidIdentifier,
  clearInvalidIdentifiers,
} = invalidIdentifiersSlice.actions;

//# endregion

//# region selectors

export const selectInvalidIdentifiers = (state: RootState) =>
  state.invalidIdentifiers.invalidIdentifiers;
export const selectInvalidIdentifiersCount = (state: RootState) =>
  Object.keys(state.invalidIdentifiers.invalidIdentifiers).length;

//# endregion
