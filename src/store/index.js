import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { weatherApi } from "./weatherApi";
import appReducer from "./appSlice";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

const customSessionStorage = {
  getItem: (key) => Promise.resolve(sessionStorage.getItem(key)),
  setItem: (key, value) => Promise.resolve(sessionStorage.setItem(key, value)),
  removeItem: (key) => Promise.resolve(sessionStorage.removeItem(key)),
};

const rootReducer = combineReducers({
  app: appReducer,
  [weatherApi.reducerPath]: weatherApi.reducer,
});

const persistConfig = {
  key: "weather-root",
  storage: customSessionStorage,
  whitelist: [weatherApi.reducerPath],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }).concat(weatherApi.middleware),
});

export const persistor = persistStore(store);
