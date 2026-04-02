import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const weatherApi = createApi({
  reducerPath: "weatherApi",
  baseQuery: fetchBaseQuery({ baseUrl: "https://api.open-meteo.com/v1/" }),

  keepUnusedDataFor: 3600,

  refetchOnMountOrArgChange: 3600,

  endpoints: (builder) => ({
    getWeather: builder.query({
      query: ({ lat, lon }) =>
        `forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,uv_index&timezone=auto`,
    }),
  }),
});

export const { useGetWeatherQuery } = weatherApi;
