import regression from "regression";
import SunCalc from "suncalc";

/**
 * МАТЕМАТИЧНА МОДЕЛЬ: Лінійна регресія з добовою сезонністю
 */
const predictParam = (dataPoints, futureX, min = -100, max = 10000) => {
  const result = regression.linear(dataPoints, { precision: 4 });
  const trendValue = result.predict(futureX)[1];

  let sumDeviation = 0;
  let count = 0;

  for (let i = 0; i < dataPoints.length; i++) {
    const pastX = dataPoints[i][0];
    const pastVal = dataPoints[i][1];

    if ((futureX - pastX) % 24 === 0) {
      const pastTrendValue = result.predict(pastX)[1];
      sumDeviation += pastVal - pastTrendValue;
      count++;
    }
  }

  const avgDeviation = count > 0 ? sumDeviation / count : 0;
  let predicted = trendValue + avgDeviation;

  return Math.max(min, Math.min(max, predicted));
};

export const generateLocalForecast = async (apiData, lat, lon) => {
  await new Promise((resolve) => setTimeout(resolve, 800));

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

    // СУВОРО ОКРУГЛЮЄМО ДАНІ ЗА ТВОЇМИ ПРАВИЛАМИ
    const t = Math.round(predictParam(trainData.temp, futureX)); // Темп: 0 знаків (як у UI)
    const p = Math.round(predictParam(trainData.pressure, futureX, 900, 1100)); // Тиск: 0 знаків
    const h = Math.round(predictParam(trainData.humidity, futureX, 0, 100)); // Вологість: 0 знаків
    let uv = Number(predictParam(trainData.uv, futureX, 0, 12).toFixed(2)); // УФ: 2 знаки
    const w = Number(predictParam(trainData.wind, futureX, 0, 150).toFixed(1)); // Вітер швидкість: 1 знак
    const d =
      Math.round(Math.abs(predictParam(trainData.dir, futureX, 0, 360))) % 360; // Вітер кут: 0 знаків
    const v = Math.round(predictParam(trainData.vis, futureX, 0, 50000)); // Видимість: 0 знаків
    let pr = Number(predictParam(trainData.precip, futureX, 0, 50).toFixed(1)); // Опади: 1 знак

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
      ), // Ощущается как: 0 знаків
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
      ), // Точка роси: 0 знаків
      precipitation: aiHourly.precipitation[0],
    },
    hourly: aiHourly,
    daily: {
      time: [now.toISOString()],
      temperature_2m_max: [Math.round(maxTemp)], // 0 знаків
      temperature_2m_min: [Math.round(minTemp)], // 0 знаків
      temperature_2m_mean: [Math.round((maxTemp + minTemp) / 2)], // Середня темп: 0 знаків
      sunrise: [sunTimes.sunrise.toISOString()], // Тільки час
      sunset: [sunTimes.sunset.toISOString()], // Тільки час
      precipitation_sum: [Number(precipSum.toFixed(1))], // 1 знак
      weather_code: [aiHourly.weather_code[12]],
    },
    isAiGenerated: true,
  };
};
