import regression from "regression";
import SunCalc from "suncalc";

/**
 * МАТЕМАТИЧНА МОДЕЛЬ: Лінійна регресія з експоненційним згладжуванням добової сезонності.
 * Чому це круто: Тренд рахується за всіма даними, але відхилення (ніч/день)
 * береться з більшою вагою для вчорашнього дня, ніж для дня 5 діб тому.
 */
const predictParam = (dataPoints, futureX, min = -100, max = 10000) => {
  // 1. Глобальний тренд (лінійна регресія по всіх 120 годинах)
  const result = regression.linear(dataPoints, { precision: 4 });
  const trendValue = result.predict(futureX)[1];

  // 2. Експоненційне згладжування добової сезонності
  let weightedSumDeviation = 0;
  let totalWeight = 0;

  for (let i = 0; i < dataPoints.length; i++) {
    const pastX = dataPoints[i][0];
    const pastVal = dataPoints[i][1];

    // Шукаємо ту саму годину в минулі дні (різниця кратна 24)
    if ((futureX - pastX) % 24 === 0) {
      const pastTrendValue = result.predict(pastX)[1];
      const deviation = pastVal - pastTrendValue;

      // ВАГА: Чим ближче pastX до futureX, тим більша вага.
      // Наприклад, для вчора (futureX - 24) вага буде великою, а для 5 днів тому - маленькою.
      // Формула: 1 / (відстань у днях). Якщо вчора (1 день) = вага 1. Якщо 5 днів тому = вага 0.2.
      const daysAgo = (futureX - pastX) / 24;
      const weight = 1 / daysAgo;

      weightedSumDeviation += deviation * weight;
      totalWeight += weight;
    }
  }

  // 3. Збираємо фінальний прогноз
  const avgDeviation = totalWeight > 0 ? weightedSumDeviation / totalWeight : 0;
  let predicted = trendValue + avgDeviation;

  return Math.max(min, Math.min(max, predicted));
};

export const generateLocalForecast = async (apiData, lat, lon) => {
  // ТАЙМАУТ ВИДАЛЕНО! Розрахунок відбувається миттєво.

  const { hourly } = apiData;
  const now = new Date();
  now.setMinutes(0, 0, 0);

  const currentIndex = hourly.time.findIndex(
    (t) => new Date(t).getTime() >= now.getTime(),
  );
  if (currentIndex === -1) throw new Error("Немає даних для розрахунку");

  const historyStart = Math.max(0, currentIndex - 120);

  const trainData = {
    temp: [],
    pressure: [],
    humidity: [],
    uv: [],
    wind: [],
    dir: [],
    vis: [],
    precip: [],
  };

  for (let i = historyStart; i < currentIndex; i++) {
    const x = i - historyStart;
    trainData.temp.push([x, hourly.temperature_2m[i]]);
    trainData.pressure.push([x, hourly.pressure_msl[i]]);
    trainData.humidity.push([x, hourly.relative_humidity_2m[i]]);
    trainData.uv.push([x, hourly.uv_index[i] || 0]);
    trainData.wind.push([x, hourly.wind_speed_10m[i]]);
    trainData.dir.push([x, hourly.wind_direction_10m[i] || 0]);
    trainData.vis.push([x, hourly.visibility[i] || 10000]);
    trainData.precip.push([x, hourly.precipitation[i] || 0]);
  }

  const aiHourly = {
    time: [],
    temperature_2m: [],
    weather_code: [],
    precipitation_probability: [],
    uv_index: [],
    wind_speed_10m: [],
    wind_direction_10m: [],
    relative_humidity_2m: [],
    visibility: [],
    pressure_msl: [],
    precipitation: [],
  };

  let maxTemp = -100;
  let minTemp = 100;
  let precipSum = 0;

  const pressureTrend =
    trainData.pressure[trainData.pressure.length - 1][1] -
    trainData.pressure[trainData.pressure.length - 12][1];

  for (let i = 0; i < 24; i++) {
    const futureX = currentIndex - historyStart + i;
    const futureTime = new Date(now.getTime() + i * 3600000).toISOString();

    // СУВОРО ОКРУГЛЮЄМО ДАНІ
    const t = Math.round(predictParam(trainData.temp, futureX));
    const p = Math.round(predictParam(trainData.pressure, futureX, 900, 1100));
    const h = Math.round(predictParam(trainData.humidity, futureX, 0, 100));
    let uv = Number(predictParam(trainData.uv, futureX, 0, 12).toFixed(2));
    const w = Number(predictParam(trainData.wind, futureX, 0, 150).toFixed(1));
    const d =
      Math.round(Math.abs(predictParam(trainData.dir, futureX, 0, 360))) % 360;
    const v = Math.round(predictParam(trainData.vis, futureX, 0, 50000));
    let pr = Number(predictParam(trainData.precip, futureX, 0, 50).toFixed(1));

    const hour = new Date(futureTime).getHours();
    if (hour < 6 || hour > 19) uv = 0;

    let prob = 0;
    if (h > 75) prob += (h - 75) * 2;
    if (pressureTrend < -2) prob += 30;
    if (pr > 0.5) prob += 40;
    prob = Math.min(100, Math.max(0, Math.round(prob)));

    let code = 0;
    if (h > 60) code = 1;
    if (h > 85) code = 3;
    if (v < 2000) code = 45;
    if (prob > 50 || pr > 0.5) code = t > 0 ? 63 : 73;

    maxTemp = Math.max(maxTemp, t);
    minTemp = Math.min(minTemp, t);
    precipSum += Math.max(0, pr);

    aiHourly.time.push(futureTime);
    aiHourly.temperature_2m.push(t);
    aiHourly.pressure_msl.push(p);
    aiHourly.relative_humidity_2m.push(h);
    aiHourly.uv_index.push(uv);
    aiHourly.wind_speed_10m.push(w);
    aiHourly.wind_direction_10m.push(d);
    aiHourly.visibility.push(v);
    aiHourly.precipitation.push(Math.max(0, pr));
    aiHourly.weather_code.push(code);
    aiHourly.precipitation_probability.push(prob);
  }

  const sunTimes = SunCalc.getTimes(now, lat, lon);

  return {
    current: {
      temperature_2m: aiHourly.temperature_2m[0],
      apparent_temperature: Math.round(
        aiHourly.temperature_2m[0] - aiHourly.wind_speed_10m[0] * 0.1,
      ),
      relative_humidity_2m: aiHourly.relative_humidity_2m[0],
      pressure_msl: aiHourly.pressure_msl[0],
      wind_speed_10m: aiHourly.wind_speed_10m[0],
      wind_direction_10m: aiHourly.wind_direction_10m[0],
      uv_index: aiHourly.uv_index[0],
      weather_code: aiHourly.weather_code[0],
      visibility: aiHourly.visibility[0],
      dew_point_2m: Math.round(
        aiHourly.temperature_2m[0] -
          (100 - aiHourly.relative_humidity_2m[0]) / 5,
      ),
      precipitation: aiHourly.precipitation[0],
    },
    hourly: aiHourly,
    daily: {
      time: [now.toISOString()],
      temperature_2m_max: [Math.round(maxTemp)],
      temperature_2m_min: [Math.round(minTemp)],
      temperature_2m_mean: [Math.round((maxTemp + minTemp) / 2)],
      sunrise: [sunTimes.sunrise.toISOString()],
      sunset: [sunTimes.sunset.toISOString()],
      precipitation_sum: [Number(precipSum.toFixed(1))],
      weather_code: [aiHourly.weather_code[12]],
    },
    isAiGenerated: true,
  };
};
