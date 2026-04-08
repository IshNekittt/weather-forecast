import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedRegion: null,
  isFullModalOpen: false,
  isAiMode: false,
  aiCalculations: {},
};

export const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setRegion: (state, action) => {
      state.selectedRegion = action.payload;
    },
    clearRegion: (state) => {
      state.selectedRegion = null;
      state.isFullModalOpen = false;
      state.isAiMode = false;
    },
    openFullModal: (state) => {
      state.isFullModalOpen = true;
    },
    toggleAiMode: (state) => {
      state.isAiMode = !state.isAiMode;
    },
    setAiCalculation: (state, action) => {
      const { regionName, data } = action.payload;
      state.aiCalculations[regionName] = {
        data,
        timestamp: Date.now(),
      };
    },
  },
});

export const {
  setRegion,
  clearRegion,
  openFullModal,
  toggleAiMode,
  setAiCalculation,
} = appSlice.actions;
export default appSlice.reducer;
