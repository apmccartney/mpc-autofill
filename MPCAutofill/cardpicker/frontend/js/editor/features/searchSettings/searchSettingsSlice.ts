import { createSlice } from "@reduxjs/toolkit";

interface SearchSettingsState {
  fuzzySearch: boolean;
  // cardSources?: Array<[string, boolean]>;
  cardSources?: Array<string>;
  // cardbackSources: Array<string>;  // TODO
  minDPI: number;
  maxDPI: number;
}

const initialState: SearchSettingsState = {
  fuzzySearch: false,
  cardSources: ["chilli"],
  // cardbackSources: null,
  minDPI: 0,
  maxDPI: 1500,
};

export const searchSettingsSlice = createSlice({
  name: "searchSettings",
  initialState,
  reducers: {
    enableFuzzySearch: (state) => {
      state.fuzzySearch = true;
    },
    disableFuzzySearch: (state) => {
      state.fuzzySearch = false;
    },
    toggleFuzzySearch: (state) => {
      state.fuzzySearch = !state.fuzzySearch;
    },
    setFuzzySearch: (state, action) => {
      state.fuzzySearch = action.payload;
    },
    addCardSource: (state, action) => {
      state.cardSources.push(action.payload);
    },
    removeCardSource: (state, action) => {
      const index = state.cardSources.indexOf(action.payload);
      if (index !== -1) {
        state.cardSources.splice(index, 1);
      }
    },
    setCardSources: (state, action) => {
      state.cardSources = [...action.payload];
    },
    // addCardbackSource: (state, action) => {
    //   state.cardbackSources.push(action.payload);
    // },
    // removeCardbackSource: (state, action) => {
    //   const index = state.cardbackSources.indexOf(action.payload);
    //   if (index !== -1) {
    //     state.cardbackSources.splice(index, 1);
    //   }
    // },
    setMinDPI: (state, action) => {
      state.minDPI = action.payload;
    },
    setMaxDPI: (state, action) => {
      state.maxDPI = action.payload;
    },
  },
});
export const {
  toggleFuzzySearch,
  enableFuzzySearch,
  disableFuzzySearch,
  setFuzzySearch,
  addCardSource,
  removeCardSource,
  setCardSources,
  // addCardbackSource,
  // removeCardbackSource,
  setMinDPI,
  setMaxDPI,
} = searchSettingsSlice.actions;
export default searchSettingsSlice.reducer;
