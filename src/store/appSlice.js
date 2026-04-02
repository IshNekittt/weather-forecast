import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedRegion: null,
  isFullModalOpen: false,
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
    },
    openFullModal: (state) => {
      state.isFullModalOpen = true;
    },
  },
});

export const { setRegion, clearRegion, openFullModal } = appSlice.actions;
export default appSlice.reducer;
