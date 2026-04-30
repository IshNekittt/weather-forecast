import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const weatherApi = createApi({
  reducerPath: "weatherApi",
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_API_URL }),

  keepUnusedDataFor: 3600,

  refetchOnMountOrArgChange: 3600,

  endpoints: (builder) => ({
    getWeather: builder.query({
      query: ({ lat, lon }) =>
        `forecast?latitude=${lat}&longitude=${lon}&past_days=5&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index,weather_code,visibility,dew_point_2m,precipitation&hourly=temperature_2m,weather_code,precipitation_probability,uv_index,wind_speed_10m,wind_direction_10m,relative_humidity_2m,visibility,pressure_msl,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,temperature_2m_mean&timezone=auto&forecast_days=10`,
    }),

    getWindField: builder.query({
      query: ({ lats, lons }) =>
        `forecast?latitude=${lats}&longitude=${lons}&current=wind_speed_10m,wind_direction_10m`,
    }),
  }),
});

export const { useGetWeatherQuery, useGetWindFieldQuery } = weatherApi;
