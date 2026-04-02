import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedRegion: null,
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
    },
  },
});

export const { setRegion, clearRegion } = appSlice.actions;
export default appSlice.reducer;
