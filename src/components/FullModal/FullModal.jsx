import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  clearRegion,
  toggleAiMode,
  setAiCalculation,
} from "../../store/appSlice";
import { useGetWeatherQuery } from "../../store/weatherApi";
import {
  getWeatherProps,
  getNext24Hours,
  capitalize,
} from "../../utils/weatherUtils";
import { generateLocalForecast } from "../../utils/aiForecastUtils";
import {
  X,
  CalendarDays,
  Clock,
  SunDim,
  Wind,
  Droplets,
  Eye,
  Gauge,
  Sunrise,
  CloudRain,
  ThermometerSun,
  Sparkles,
} from "lucide-react";
import { skipToken } from "@reduxjs/toolkit/query";
import toast from "react-hot-toast";
import styles from "./FullModal.module.css";

const FullModal = () => {
  const dispatch = useDispatch();
  const { selectedRegion, isFullModalOpen, isAiMode, aiCalculations } =
    useSelector((state) => state.app);

  const [selectedDay, setSelectedDay] = useState(null);
  const [metricModal, setMetricModal] = useState(null);

  const { data: apiData } = useGetWeatherQuery(
    selectedRegion
      ? { lat: selectedRegion.lat, lon: selectedRegion.lon }
      : skipToken,
    { skip: !selectedRegion },
  );

  const handleAiToggle = async (e) => {
    e.stopPropagation();

    if (isAiMode) {
      dispatch(toggleAiMode());
      toast.success("Повернуто до даних агрегатора");
      return;
    }

    const cachedCalc = aiCalculations[selectedRegion.name];
    const isCacheValid =
      cachedCalc && Date.now() - cachedCalc.timestamp < 3600000;

    if (isCacheValid) {
      dispatch(toggleAiMode());
      toast.success("Завантажено локальний AI прогноз");
    } else {
      const calcPromise = generateLocalForecast(
        apiData,
        selectedRegion.lat,
        selectedRegion.lon,
      );

      toast.promise(calcPromise, {
        loading: "Математичний розрахунок прогнозу...",
        success: "Локальний прогноз побудовано!",
        error: "Помилка розрахунку",
      });

      try {
        const calculatedData = await calcPromise;
        dispatch(
          setAiCalculation({
            regionName: selectedRegion.name,
            data: calculatedData,
          }),
        );
        dispatch(toggleAiMode());
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!isFullModalOpen || !apiData) return null;

  const displayData =
    isAiMode && aiCalculations[selectedRegion.name]
      ? aiCalculations[selectedRegion.name].data
      : apiData;

  const { current, daily, hourly } = displayData;
  const currentProps = getWeatherProps(current.weather_code);
  const hourly24 = getNext24Hours(hourly);

  // --- МАТЕМАТИКА ВИДЖЕТОВ ---
  const uvPercent = Math.min((current.uv_index / 11) * 100, 100);

  const minP = 970;
  const maxP = 1050;
  const currentP = Math.max(minP, Math.min(maxP, current.pressure_msl));
  const pressurePercent = (currentP - minP) / (maxP - minP);
  const pressureRotation = -135 + pressurePercent * 270;

  // Математика Солнца
  const sunrise = new Date(daily.sunrise[0]);
  const sunset = new Date(daily.sunset[0]);
  const now = new Date();
  let daylightPercent = (now - sunrise) / (sunset - sunrise);
  daylightPercent = Math.max(0, Math.min(1, daylightPercent));
  const sunRotation = -90 + daylightPercent * 180;

  const timeOpts = { hour: "2-digit", minute: "2-digit" };
  const sunriseStr = sunrise.toLocaleTimeString("uk-UA", timeOpts);
  const sunsetStr = sunset.toLocaleTimeString("uk-UA", timeOpts);

  // --- 1. МОДАЛКА: ПРОГНОЗ ПО ЧАСАМ НА ВЫБРАННЫЙ ДЕНЬ ---
  const renderHourlyForSelectedDay = () => {
    if (selectedDay === null) return null;
    const startIndex = selectedDay * 24;
    const dayHours = [];
    for (let i = startIndex; i < startIndex + 24; i++) {
      if (!hourly.time[i]) break;
      const date = new Date(hourly.time[i]);
      dayHours.push({
        time: date.toLocaleTimeString("uk-UA", timeOpts),
        temp: Math.round(hourly.temperature_2m[i]),
        code: hourly.weather_code[i],
        precipProb: hourly.precipitation_probability
          ? hourly.precipitation_probability[i]
          : 0,
      });
    }
    const dayName =
      selectedDay === 0
        ? "Сьогодні"
        : capitalize(
            new Date(daily.time[selectedDay]).toLocaleDateString("uk-UA", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }),
          );

    return (
      <div
        className={styles.innerModalOverlay}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedDay(null);
        }}
      >
        <div
          className={styles.innerModalContent}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.innerModalHeader}>
            <span>{dayName}</span>
            <button
              className={styles.closeBtn}
              style={{ position: "static", width: "32px", height: "32px" }}
              onClick={() => setSelectedDay(null)}
            >
              <X size={18} />
            </button>
          </div>
          <div className={styles.innerModalScroll}>
            {dayHours.map((h, idx) => (
              <div key={idx} className={styles.innerHourRow}>
                {/* ЛЕВАЯ КОЛОНКА: Занимает равную долю, выравнивание влево */}
                <span style={{ flex: 1, textAlign: "left" }}>{h.time}</span>

                {/* ЦЕНТР: Жестко 75px. Состоит из иконки (24px) и процентов (30px) */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "75px",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    {getWeatherProps(h.code).icon}
                  </div>
                  <div style={{ width: "30px", textAlign: "left" }}>
                    {h.precipProb > 0 && (
                      <span
                        className={styles.precipProbText}
                        style={{ margin: 0 }}
                      >
                        {h.precipProb}%
                      </span>
                    )}
                  </div>
                </div>

                {/* ПРАВАЯ КОЛОНКА: Занимает равную долю, выравнивание вправо */}
                <span
                  style={{ flex: 1, textAlign: "right", fontWeight: "bold" }}
                >
                  {h.temp}°
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- 2. МОДАЛКА: ДЕТАЛИЗАЦИЯ ВИДЖЕТОВ (ВЕТЕР, УФ И Т.Д.) ---
  const renderMetricModal = () => {
    if (!metricModal) return null;

    let list = [];
    if (metricModal.isDaily) {
      list = daily.time.map((t, i) => {
        const dayName =
          i === 0
            ? "Сьогодні"
            : capitalize(
                new Date(t).toLocaleDateString("uk-UA", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                }),
              );
        let valStr = "";
        if (metricModal.key === "sun") {
          valStr = `Схід ${new Date(daily.sunrise[i]).toLocaleTimeString(
            "uk-UA",
            timeOpts,
          )} • Захід ${new Date(daily.sunset[i]).toLocaleTimeString(
            "uk-UA",
            timeOpts,
          )}`;
        } else {
          valStr = `${Math.round(daily[metricModal.key][i])} ${metricModal.unit}`;
        }
        return { label: dayName, value: valStr };
      });
    } else {
      list = hourly24.map((h) => {
        let val = hourly[metricModal.key]
          ? hourly[metricModal.key][h.index]
          : 0;
        let extra = null;

        // ПРИНУДИТЕЛЬНОЕ UI ОКРУГЛЕНИЕ ДЛЯ СПИСКОВ
        if (metricModal.key === "visibility") {
          val = Math.round(val / 1000); // 0 знаков в км
        } else if (
          metricModal.key === "pressure_msl" ||
          metricModal.key === "relative_humidity_2m" ||
          metricModal.key === "temperature_2m_mean" ||
          metricModal.key === "temperature_2m"
        ) {
          val = Math.round(val); // 0 знаков
        } else if (metricModal.key === "uv_index") {
          val = Number(val).toFixed(2); // Ровно 2 знака (например 0.00 или 2.10)
        } else if (metricModal.key === "precipitation") {
          val = Number(val).toFixed(1); // Ровно 1 знак
        }

        // СПЕЦ. ЛОГИКА ДЛЯ ВЕТРА
        if (metricModal.key === "wind_speed_10m") {
          val = (val / 3.6).toFixed(1); // 1 знак для м/с
          const dir = hourly.wind_direction_10m
            ? Math.round(hourly.wind_direction_10m[h.index])
            : 0; // 0 знаков для угла

          extra = (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "75px",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "24px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 100 100"
                  style={{
                    transform: `rotate(${dir}deg)`,
                    overflow: "visible",
                  }}
                >
                  <path
                    d="M 50 15 L 42 45 L 50 38 L 58 45 Z"
                    fill="white"
                    stroke="white"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="50"
                    y1="40"
                    x2="50"
                    y2="85"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div
                style={{
                  width: "30px",
                  textAlign: "left",
                  fontSize: "0.8rem",
                  opacity: 0.8,
                }}
              >
                {dir}°
              </div>
            </div>
          );
        }

        return { label: h.time, value: `${val} ${metricModal.unit}`, extra };
      });
    }

    return (
      <div
        className={styles.innerModalOverlay}
        onClick={(e) => {
          e.stopPropagation();
          setMetricModal(null);
        }}
      >
        <div
          className={styles.innerModalContent}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.innerModalHeader}>
            <span>{metricModal.title}</span>
            <button
              className={styles.closeBtn}
              style={{ position: "static", width: "32px", height: "32px" }}
              onClick={() => setMetricModal(null)}
            >
              <X size={18} />
            </button>
          </div>
          <div className={styles.innerModalScroll}>
            {list.map((item, idx) => (
              <div key={idx} className={styles.innerHourRow}>
                {/* ЛЕВАЯ КОЛОНКА */}
                <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>

                {item.extra && item.extra}

                {/* ПРАВАЯ КОЛОНКА */}
                <span
                  style={{
                    flex: item.extra ? 1 : 1.5,
                    textAlign: "right",
                    fontWeight: "bold",
                    lineHeight: 1.4,
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    // Главный оверлей: клик по пустому месту закрывает большую модалку
    <div
      className={styles.modalOverlay}
      onClick={() => dispatch(clearRegion())}
    >
      {/* <video
        className={styles.bgVideo}
        autoPlay
        loop
        muted
        playsInline
        src="https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/rooster.mp4"
      /> */}

      <button
        className={styles.closeBtn}
        style={{
          right: "70px",
          background: isAiMode
            ? "rgba(170, 59, 255, 0.5)"
            : "rgba(255, 255, 255, 0.2)",
        }}
        onClick={handleAiToggle}
        title="Локальний розрахунок прогнозу"
      >
        <Sparkles
          size={20}
          color={isAiMode ? "white" : "rgba(255,255,255,0.7)"}
        />
      </button>

      <button
        className={styles.closeBtn}
        onClick={() => dispatch(clearRegion())}
      >
        <X size={24} />
      </button>

      <div className={styles.content}>
        {/* ХЕДЕР (пропускает клик на фон) */}
        <div className={styles.header}>
          <h1 className={styles.regionName}>
            {selectedRegion.name}
            {isAiMode && (
              <span
                style={{
                  fontSize: "0.8rem",
                  background: "#aa3bff",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  marginLeft: "10px",
                  verticalAlign: "middle",
                  whiteSpace: "nowrap",
                }}
              >
                AI Forecast
              </span>
            )}
          </h1>
          <div className={styles.currentTemp}>
            {Math.round(current.temperature_2m)}°
          </div>
          <div className={styles.condition}>{currentProps.text}</div>
          <div className={styles.highLow}>
            Макс.: {Math.round(daily.temperature_2m_max[0])}°, Мін.:{" "}
            {Math.round(daily.temperature_2m_min[0])}°
          </div>
        </div>

        {/* ПРОГНОЗ НА 24 ЧАСА */}
        <div className={styles.glassPanel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.panelTitle}>
            <Clock size={14} /> Прогноз на 24 години
          </div>
          <div className={styles.hourlyScroll}>
            {hourly24.map((hour, i) => (
              <div key={i} className={styles.hourBlock}>
                <span className={styles.hourTime}>{hour.time}</span>
                {/* Обертка для иконки и вероятности осадков (выравнивает высоту) */}
                <div className={styles.hourIconWrapper}>
                  {getWeatherProps(hour.code).icon}
                  {hour.precipProb > 0 && (
                    <span className={styles.precipProbText}>
                      {hour.precipProb}%
                    </span>
                  )}
                </div>
                <span className={styles.hourTemp}>{hour.temp}°</span>
              </div>
            ))}
          </div>
        </div>

        {/* НОВАЯ РАСКЛАДКА НА ДЕСКТОПЕ: ДВЕ КОЛОНКИ */}
        <div className={styles.bottomLayout}>
          {/* ЛЕВАЯ КОЛОНКА (10 ДНЕЙ) */}
          {!isAiMode && (
            <div
              className={`${styles.glassPanel} ${styles.dailyPanel}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.panelTitle}>
                <CalendarDays size={14} /> Прогноз на 10 днів
              </div>
              <div className={styles.dailyList}>
                {daily.time.map((dateString, i) => {
                  const dayName =
                    i === 0
                      ? "Сьогодні"
                      : capitalize(
                          new Date(dateString).toLocaleDateString("uk-UA", {
                            weekday: "short",
                          }),
                        );
                  return (
                    <div
                      key={i}
                      className={styles.dailyRow}
                      onClick={() => setSelectedDay(i)}
                    >
                      <span className={styles.dayName}>{dayName}</span>
                      <span className={styles.dayIcon}>
                        {getWeatherProps(daily.weather_code[i]).icon}
                      </span>
                      <div className={styles.dayTemps}>
                        <span className={styles.tempMin}>
                          від {Math.round(daily.temperature_2m_min[i])}°
                        </span>
                        <span className={styles.tempMax}>
                          до {Math.round(daily.temperature_2m_max[i])}°
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ПРАВАЯ КОЛОНКА (СЕТКА ВИДЖЕТОВ) */}
          <div
            className={styles.widgetsGrid}
            onClick={(e) => e.stopPropagation()}
          >
            {/* СОЛНЦЕ */}
            <div
              className={`${styles.glassPanel} ${styles.squareWidget} ${styles.clickablePanel}`}
              onClick={() =>
                setMetricModal({ title: "СОНЦЕ", isDaily: true, key: "sun" })
              }
            >
              <div className={styles.panelTitle}>
                <Sunrise size={14} /> СОНЦЕ
              </div>
              <svg
                viewBox="0 0 100 55"
                className={styles.sunSvg}
                style={{ marginTop: "auto" }}
              >
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="50"
                  x2="100"
                  y2="50"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1"
                />
                <g transform={`translate(50, 50) rotate(${sunRotation})`}>
                  <circle
                    cx="0"
                    cy="-40"
                    r="5"
                    fill="#facc15"
                    filter="drop-shadow(0 0 4px #facc15)"
                  />
                </g>
              </svg>
              <div className={styles.sunTimes}>
                <span>Схід {sunriseStr}</span>
                <span>Захід {sunsetStr}</span>
              </div>
            </div>

            {/* ОСАДКИ */}
            <div
              className={`${styles.glassPanel} ${styles.squareWidget} ${styles.clickablePanel}`}
              onClick={() =>
                setMetricModal({
                  title: "ОПАДИ",
                  key: "precipitation",
                  unit: "мм",
                })
              }
            >
              <div className={styles.panelTitle}>
                <CloudRain size={14} /> ОПАДИ
              </div>
              <div className={styles.widgetValue}>
                {current.precipitation.toFixed(1)}{" "}
                <span style={{ fontSize: "1rem" }}>мм</span>
              </div>
              <div className={styles.widgetDesc}>
                За добу: {daily.precipitation_sum[0].toFixed(1)} мм
              </div>
            </div>

            {/* СРЕДНЯЯ ТЕМПЕРАТУРА */}
            <div
              className={`${styles.glassPanel} ${styles.squareWidget} ${styles.clickablePanel}`}
              onClick={() =>
                setMetricModal({
                  title: "СЕРЕДНЯ ТЕМП.",
                  isDaily: true,
                  key: "temperature_2m_mean",
                  unit: "°",
                })
              }
            >
              <div className={styles.panelTitle}>
                <ThermometerSun size={14} /> СЕРЕДНЯ ТЕМП.
              </div>
              <div className={styles.widgetValue}>
                {Math.round(daily.temperature_2m_mean[0])}°
              </div>
              <div className={styles.widgetDesc}>В середньому за добу</div>
            </div>

            {/* УФ-ИНДЕКС */}
            <div
              className={`${styles.glassPanel} ${styles.squareWidget} ${styles.clickablePanel}`}
              onClick={() =>
                setMetricModal({
                  title: "УФ-ІНДЕКС",
                  key: "uv_index",
                  unit: "",
                })
              }
            >
              <div className={styles.panelTitle}>
                <SunDim size={14} /> УФ-ІНДЕКС
              </div>
              <div className={styles.widgetValue}>
                {current.uv_index.toFixed(2)}
              </div>
              <div className={styles.widgetDesc}>
                {current.uv_index <= 2 ? "Низький" : "Помірний"}
              </div>
              <div className={styles.uvScaleContainer}>
                <div
                  className={styles.uvDonut}
                  style={{ left: `${uvPercent}%` }}
                ></div>
              </div>
            </div>

            {/* ВЕТЕР */}
            <div
              className={`${styles.glassPanel} ${styles.squareWidget} ${styles.clickablePanel}`}
              onClick={() =>
                setMetricModal({
                  title: "ВІТЕР",
                  key: "wind_speed_10m",
                  unit: "м/с",
                })
              }
            >
              <div className={styles.panelTitle}>
                <Wind size={14} /> ВІТЕР
              </div>
              <div className={styles.compassContainer}>
                <span className={styles.compassMark} style={{ top: "4px" }}>
                  Пн
                </span>
                <span className={styles.compassMark} style={{ bottom: "4px" }}>
                  Пд
                </span>
                <span className={styles.compassMark} style={{ left: "6px" }}>
                  Зх
                </span>
                <span className={styles.compassMark} style={{ right: "6px" }}>
                  Сх
                </span>
                <svg
                  width="65"
                  height="65"
                  viewBox="0 0 100 100"
                  style={{
                    transform: `rotate(${current.wind_direction_10m}deg)`,
                    position: "absolute",
                    overflow: "visible",
                  }}
                >
                  <path
                    d="M 50 20 L 44 42 L 50 38 L 56 42 Z"
                    fill="white"
                    stroke="white"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="50"
                    y1="40"
                    x2="50"
                    y2="80"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="1"
                  />
                </svg>
              </div>
              <div
                className={styles.widgetDesc}
                style={{ textAlign: "center" }}
              >
                {(current.wind_speed_10m / 3.6).toFixed(1)} м/с •{" "}
                {current.wind_direction_10m}°
              </div>
            </div>

            {/* ВЛАЖНОСТЬ */}
            <div
              className={`${styles.glassPanel} ${styles.squareWidget} ${styles.clickablePanel}`}
              onClick={() =>
                setMetricModal({
                  title: "ВОЛОГІСТЬ",
                  key: "relative_humidity_2m",
                  unit: "%",
                })
              }
            >
              <div className={styles.panelTitle}>
                <Droplets size={14} /> ВОЛОГІСТЬ
              </div>
              <div className={styles.widgetValue}>
                {current.relative_humidity_2m}%
              </div>
              <div className={styles.widgetDesc}>
                Точка роси: {Math.round(current.dew_point_2m)}°
              </div>
            </div>

            {/* ВИДИМОСТЬ */}
            <div
              className={`${styles.glassPanel} ${styles.squareWidget} ${styles.clickablePanel}`}
              onClick={() =>
                setMetricModal({
                  title: "ВИДИМІСТЬ",
                  key: "visibility",
                  unit: "км",
                })
              }
            >
              <div className={styles.panelTitle}>
                <Eye size={14} /> ВИДИМІСТЬ
              </div>
              <div className={styles.widgetValue}>
                {(current.visibility / 1000).toFixed(0)}{" "}
                <span style={{ fontSize: "1rem" }}>км</span>
              </div>
              <div className={styles.widgetDesc}>Чисте небо</div>
            </div>

            {/* ДАВЛЕНИЕ */}
            <div
              className={`${styles.glassPanel} ${styles.squareWidget} ${styles.pressureWidget} ${styles.clickablePanel}`}
              onClick={() =>
                setMetricModal({
                  title: "ТИСК",
                  key: "pressure_msl",
                  unit: "гПа",
                })
              }
            >
              <div
                className={styles.panelTitle}
                style={{ position: "absolute", top: "15px", left: "20px" }}
              >
                <Gauge size={14} /> ТИСК
              </div>
              <div className={styles.pressureContainer}>
                <svg viewBox="0 0 100 100" className={styles.pressureSvg}>
                  <path
                    d="M 21.7 78.3 A 40 40 0 1 1 78.3 78.3"
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <g
                    transform={`translate(50, 50) rotate(${pressureRotation})`}
                  >
                    <line
                      x1="0"
                      y1="-35"
                      x2="0"
                      y2="-45"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>
                <div className={styles.pressureValueAbs}>
                  <span className={styles.pressureNumber}>
                    {Math.round(current.pressure_msl)}
                  </span>
                  <span className={styles.pressureUnit}>гПа</span>
                </div>
                <div className={styles.pressureLabels}>
                  <span>Низький</span>
                  <span>Високий</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {renderHourlyForSelectedDay()}
      {renderMetricModal()}
    </div>
  );
};

export default FullModal;
