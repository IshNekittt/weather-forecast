import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const weatherApi = createApi({
  reducerPath: "weatherApi",
  baseQuery: fetchBaseQuery({ baseUrl: "https://api.open-meteo.com/v1/" }),

  keepUnusedDataFor: 3600,

  refetchOnMountOrArgChange: 3600,

  endpoints: (builder) => ({
    getWeather: builder.query({
      query: ({ lat, lon }) =>
        `forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index,weather_code,visibility,dew_point_2m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum&timezone=auto&forecast_days=10`,
    }),
  }),
});

export const { useGetWeatherQuery } = weatherApi;
