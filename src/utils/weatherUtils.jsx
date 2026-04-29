import React from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
} from "lucide-react";

export const getWeatherProps = (code) => {
  const map = {
    0: { text: "Ясно", icon: <Sun size={24} /> },
    1: { text: "Переважно ясно", icon: <Cloud size={24} /> },
    2: { text: "Мінлива хмарність", icon: <Cloud size={24} /> },
    3: { text: "Похмуро", icon: <Cloud size={24} /> },
    45: { text: "Туман", icon: <CloudFog size={24} /> },
    48: { text: "Туман з інеєм", icon: <CloudFog size={24} /> },
    51: { text: "Мряка", icon: <CloudDrizzle size={24} /> },
    61: { text: "Невеликий дощ", icon: <CloudRain size={24} /> },
    63: { text: "Дощ", icon: <CloudRain size={24} /> },
    65: { text: "Сильний дощ", icon: <CloudRain size={24} /> },
    71: { text: "Невеликий сніг", icon: <CloudSnow size={24} /> },
    73: { text: "Сніг", icon: <CloudSnow size={24} /> },
    75: { text: "Сильний сніг", icon: <CloudSnow size={24} /> },
    95: { text: "Гроза", icon: <CloudLightning size={24} /> },
  };
  return map[code] || { text: "Невідомо", icon: <Sun size={24} /> };
};

export const getNext24Hours = (hourlyData) => {
  const now = new Date();
  now.setMinutes(0, 0, 0);

  let startIndex = hourlyData.time.findIndex(
    (t) => new Date(t).getTime() >= now.getTime(),
  );
  if (startIndex === -1) startIndex = 0;

  const next24 = [];
  for (let i = startIndex; i < startIndex + 24; i++) {
    if (!hourlyData.time[i]) break;
    const date = new Date(hourlyData.time[i]);
    next24.push({
      time: date.toLocaleTimeString("uk-UA", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      temp: Math.round(hourlyData.temperature_2m[i]),
      code: hourlyData.weather_code[i],
      precipProb: hourlyData.precipitation_probability
        ? hourlyData.precipitation_probability[i]
        : 0,
      index: i,
    });
  }
  if (next24.length > 0) next24[0].time = "Зараз";
  return next24;
};

export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getBackgroundVideoName = (weatherCode, windSpeedKmh, dateStr) => {
  const codeMap = {
    0: "Clear",
    1: "Mainly_Clear",
    2: "Partly_Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime_Fog",
    51: "Drizzle",
    53: "Drizzle",
    55: "Drizzle",
    56: "Drizzle",
    57: "Drizzle",
    61: "Light_Rain",
    80: "Light_Rain",
    63: "Rain",
    81: "Rain",
    65: "Heavy_Rain",
    82: "Heavy_Rain",
    71: "Light_Snow",
    85: "Light_Snow",
    73: "Snow",
    86: "Snow",
    75: "Heavy_Snow",
    77: "Heavy_Snow",
    95: "Thunderstorm",
    96: "Thunderstorm",
    99: "Thunderstorm",
  };

  const condition = codeMap[weatherCode] || "Clear";

  const hour = new Date(dateStr).getHours();
  let timeOfDay = "Night";

  if (hour >= 6 && hour < 12) {
    timeOfDay = "Morning";
  } else if (hour >= 12 && hour < 18) {
    timeOfDay = "Day"; // 12:00 - 17:59
  } else if (hour >= 18 && hour < 24) {
    timeOfDay = "Evening";
  }

  const wind = windSpeedKmh >= 18 ? "Wind" : "No_Wind";

  return `${condition}_${timeOfDay}_${wind}`;
};
