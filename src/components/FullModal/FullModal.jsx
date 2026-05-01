import React, { useState, useEffect } from "react";
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
  getBackgroundVideoName,
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

  const [loadedVideoUrl, setLoadedVideoUrl] = useState(null);
  const [failedUrls, setFailedUrls] = useState(new Set());

  const { data: apiData } = useGetWeatherQuery(
    selectedRegion
      ? { lat: selectedRegion.lat, lon: selectedRegion.lon }
      : skipToken,
    { skip: !selectedRegion },
  );

  const baseUrl = import.meta.env.VITE_VIDEO_BASE_URL;
  const fallbackUrl = `${baseUrl}Clear_Morning_No_Wind.mp4`;

  let idealUrl = null;
  if (apiData && isFullModalOpen) {
    const timeStr = apiData.current.time || new Date().toISOString();
    const videoName = getBackgroundVideoName(
      apiData.current.weather_code,
      apiData.current.wind_speed_10m,
      timeStr,
    );
    idealUrl = `${baseUrl}${videoName}.mp4`;
  }

  let currentVideoUrl = idealUrl;
  if (failedUrls.has(idealUrl)) {
    currentVideoUrl = fallbackUrl;
  }
  if (failedUrls.has(fallbackUrl)) {
    currentVideoUrl = null;
  }

  const showModal = loadedVideoUrl === currentVideoUrl || !currentVideoUrl;

  useEffect(() => {
    if (
      isFullModalOpen &&
      currentVideoUrl &&
      loadedVideoUrl !== currentVideoUrl
    ) {
      toast.loading("Завантаження фону...", { id: "fm-loader" });
    } else {
      toast.dismiss("fm-loader");
    }
    return () => toast.dismiss("fm-loader");
  }, [isFullModalOpen, currentVideoUrl, loadedVideoUrl]);

  if (!isFullModalOpen || !apiData) return null;

  const handleAiToggle = async (e) => {
    e.stopPropagation();

    // РОБИМО СПОВІЩЕННЯ КЛІКАБЕЛЬНИМИ ТА ШВИДШИМИ (2.5 сек)
    if (isAiMode) {
      dispatch(toggleAiMode());
      toast.success(
        (t) => (
          <div
            onClick={() => toast.dismiss(t.id)}
            style={{ cursor: "pointer", width: "100%" }}
          >
            Повернуто до даних агрегатора
          </div>
        ),
        { duration: 2500 },
      );
      return;
    }

    const cachedCalc = aiCalculations[selectedRegion.name];
    if (cachedCalc && Date.now() - cachedCalc.timestamp < 3600000) {
      dispatch(toggleAiMode());
      toast.success(
        (t) => (
          <div
            onClick={() => toast.dismiss(t.id)}
            style={{ cursor: "pointer", width: "100%" }}
          >
            Завантажено локальний AI прогноз
          </div>
        ),
        { duration: 2500 },
      );
    } else {
      const toastId = toast.loading((t) => (
        <div
          onClick={() => toast.dismiss(t.id)}
          style={{ cursor: "pointer", width: "100%" }}
        >
          Математичний розрахунок...
        </div>
      ));

      try {
        const calcPromise = generateLocalForecast(
          apiData,
          selectedRegion.lat,
          selectedRegion.lon,
        );
        const result = await calcPromise;
        dispatch(
          setAiCalculation({ regionName: selectedRegion.name, data: result }),
        );
        dispatch(toggleAiMode());

        toast.success(
          (t) => (
            <div
              onClick={() => toast.dismiss(t.id)}
              style={{ cursor: "pointer", width: "100%" }}
            >
              AI прогноз побудовано!
            </div>
          ),
          { id: toastId, duration: 2500 },
        );
      } catch (err) {
        console.error(err);
        toast.error(
          (t) => (
            <div
              onClick={() => toast.dismiss(t.id)}
              style={{ cursor: "pointer", width: "100%" }}
            >
              Помилка розрахунку
            </div>
          ),
          { id: toastId, duration: 2500 },
        );
      }
    }
  };

  const displayData =
    isAiMode && aiCalculations[selectedRegion.name]
      ? aiCalculations[selectedRegion.name].data
      : apiData;
  const { current, daily, hourly } = displayData;

  const todayStr = new Date().toISOString().split("T")[0];
  let todayIdxInApi = apiData.daily.time.findIndex((t) =>
    t.startsWith(todayStr),
  );
  if (todayIdxInApi === -1) todayIdxInApi = 0;
  const activeIdx = isAiMode ? 0 : todayIdxInApi;

  const futureDaysIndices = [];
  if (!isAiMode) {
    for (let i = todayIdxInApi; i < apiData.daily.time.length; i++)
      futureDaysIndices.push(i);
  }

  const uvPercent = Math.min((current.uv_index / 11) * 100, 100);
  const pressureRotation =
    -135 +
    ((Math.max(970, Math.min(1050, current.pressure_msl)) - 970) /
      (1050 - 970)) *
      270;
  const sunriseDate = new Date(daily.sunrise[activeIdx]);
  const sunsetDate = new Date(daily.sunset[activeIdx]);
  const nowTime = new Date().getTime();
  const isCurrentDay =
    nowTime >= sunriseDate.getTime() && nowTime <= sunsetDate.getTime();
  const currentProps = getWeatherProps(current.weather_code, isCurrentDay);
  const hourly24 = getNext24Hours(hourly, daily);
  const daylightPercent = Math.max(
    0,
    Math.min(1, (new Date() - sunriseDate) / (sunsetDate - sunriseDate)),
  );
  const sunRotation = -90 + daylightPercent * 180;
  const timeOpts = { hour: "2-digit", minute: "2-digit" };
  const sunriseStr = sunriseDate.toLocaleTimeString("uk-UA", timeOpts);
  const sunsetStr = sunsetDate.toLocaleTimeString("uk-UA", timeOpts);

  const renderHourlyForSelectedDay = () => {
    if (selectedDay === null) return null;
    const startIndex = isAiMode ? 0 : selectedDay * 24;
    const dayHours = [];

    const dIdx = isAiMode ? 0 : selectedDay;
    const baseSrDate = new Date(daily.sunrise[dIdx]);
    const baseSsDate = new Date(daily.sunset[dIdx]);

    for (let i = startIndex; i < startIndex + 24; i++) {
      if (!hourly.time[i]) break;
      const date = new Date(hourly.time[i]);

      const srDate = new Date(baseSrDate);
      const ssDate = new Date(baseSsDate);
      srDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      ssDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());

      const t = date.getTime();
      const isDay = t >= srDate.getTime() && t <= ssDate.getTime();

      dayHours.push({
        time: date.toLocaleTimeString("uk-UA", timeOpts),
        temp: Math.round(hourly.temperature_2m[i]),
        code: hourly.weather_code[i],
        precipProb: hourly.precipitation_probability
          ? hourly.precipitation_probability[i]
          : 0,
        isDay,
      });
    }

    const dayName =
      selectedDay === todayIdxInApi
        ? "Сьогодні"
        : capitalize(
            new Date(
              displayData.daily.time[isAiMode ? 0 : selectedDay],
            ).toLocaleDateString("uk-UA", {
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
                <span style={{ flex: 1, textAlign: "left" }}>{h.time}</span>
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
                      <span className={styles.precipProbText}>
                        {h.precipProb}%
                      </span>
                    )}
                  </div>
                </div>
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

  const renderMetricModal = () => {
    if (!metricModal) return null;

    let list = [];
    if (metricModal.isDaily) {
      const indices = isAiMode ? [0] : futureDaysIndices;
      list = indices.map((dIdx) => {
        const t = daily.time[dIdx];
        const dayName =
          isAiMode || dIdx === activeIdx
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
          const sr = new Date(daily.sunrise[dIdx]).toLocaleTimeString(
            "uk-UA",
            timeOpts,
          );
          const ss = new Date(daily.sunset[dIdx]).toLocaleTimeString(
            "uk-UA",
            timeOpts,
          );
          valStr = `Схід\u00A0${sr} • Захід\u00A0${ss}`;
        } else {
          valStr = `${Math.round(daily[metricModal.key][dIdx])} ${metricModal.unit}`;
        }
        return { label: dayName, value: valStr };
      });
    } else {
      list = hourly24.map((h) => {
        let val = hourly[metricModal.key]
          ? hourly[metricModal.key][h.index]
          : 0;
        let extra = null;

        if (metricModal.key === "visibility") {
          val = Math.round(val / 1000);
        } else if (
          [
            "pressure_msl",
            "relative_humidity_2m",
            "temperature_2m_mean",
            "temperature_2m",
          ].includes(metricModal.key)
        ) {
          val = Math.round(val);
        } else if (metricModal.key === "uv_index") {
          val = Number(val).toFixed(2);
        } else if (metricModal.key === "precipitation") {
          val = Number(val).toFixed(1);
        }

        if (metricModal.key === "wind_speed_10m") {
          val = (val / 3.6).toFixed(1);
          const dir = hourly.wind_direction_10m
            ? Math.round(hourly.wind_direction_10m[h.index])
            : 0;

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
                    transform: `rotate(${dir + 180}deg)`,
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
              <div
                key={idx}
                className={styles.innerHourRow}
                style={{ gap: "10px" }}
              >
                <span
                  style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap" }}
                >
                  {item.label}
                </span>

                {item.extra && item.extra}

                <span
                  style={{
                    flex: item.extra ? 1 : 2,
                    textAlign: "right",
                    fontWeight: "bold",
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
    <div
      className={styles.modalOverlay}
      onClick={() => dispatch(clearRegion())}
      style={{
        opacity: showModal ? 1 : 0,
        visibility: showModal ? "visible" : "hidden",
        transition: "opacity 0.4s ease, visibility 0.4s ease",
      }}
    >
      {currentVideoUrl && (
        <video
          key={currentVideoUrl}
          className={styles.bgVideo}
          autoPlay
          loop
          muted
          playsInline
          src={currentVideoUrl}
          onCanPlayThrough={() => setLoadedVideoUrl(currentVideoUrl)}
          onError={() => {
            setFailedUrls((prev) => new Set(prev).add(currentVideoUrl));
          }}
        />
      )}

      <button
        className={styles.closeBtn}
        style={{
          right: "70px",
          background: isAiMode
            ? "rgba(170, 59, 255, 0.5)"
            : "rgba(255, 255, 255, 0.2)",
        }}
        onClick={handleAiToggle}
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
            Макс.: {Math.round(daily.temperature_2m_max[activeIdx])}°, Мін.:{" "}
            {Math.round(daily.temperature_2m_min[activeIdx])}°
          </div>
        </div>

        <div className={styles.glassPanel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.panelTitle}>
            <Clock size={14} /> Прогноз на 24 години
          </div>
          <div className={styles.hourlyScroll}>
            {hourly24.map((hour, i) => (
              <div key={i} className={styles.hourBlock}>
                <span className={styles.hourTime}>{hour.time}</span>
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

        <div className={styles.bottomLayout}>
          {isAiMode ? (
            <div
              className={`${styles.glassPanel} ${styles.dailyPanel}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.panelTitle}>
                <Sparkles size={14} /> Про локальну AI модель
              </div>
              <div className={styles.aiDescContent}>
                <div className={styles.aiDescBlock}>
                  <strong>Що це за режим?</strong>
                  <p>
                    Це математична модель прогнозування, яка виконує всі
                    розрахунки локально - безпосередньо у вашому браузері, без
                    звернення до сторонніх серверів
                  </p>
                </div>
                <div className={styles.aiDescBlock}>
                  <strong>Як вона рахує?</strong>
                  <p>
                    Алгоритм бере останні 120 годин фактичної погоди та
                    використовує лінійну регресію для визначення загального
                    тренду. Також застосовується експоненційне згладжування для
                    врахування добової сезонності - різниці між днем і ніччю
                  </p>
                </div>
                <div className={styles.aiDescBlock}>
                  <strong>Для чого це потрібно?</strong>
                  <p>
                    Режим демонструє роботу прогностичних алгоритмів у
                    веб-застосунку. Він генерує незалежний, альтернативний
                    прогноз на найближчі 24 години на основі чистих математичних
                    формул
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`${styles.glassPanel} ${styles.dailyPanel}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.panelTitle}>
                <CalendarDays size={14} /> Прогноз на 10 днів
              </div>
              <div className={styles.dailyList}>
                {futureDaysIndices.map((dIdx, loopIdx) => (
                  <div
                    key={dIdx}
                    className={styles.dailyRow}
                    onClick={() => setSelectedDay(dIdx)}
                  >
                    <span className={styles.dayName}>
                      {loopIdx === 0
                        ? "Сьогодні"
                        : capitalize(
                            new Date(daily.time[dIdx]).toLocaleDateString(
                              "uk-UA",
                              { weekday: "short" },
                            ),
                          )}
                    </span>
                    <span className={styles.dayIcon}>
                      {getWeatherProps(daily.weather_code[dIdx]).icon}
                    </span>
                    <div className={styles.dayTemps}>
                      <span className={styles.tempMin}>
                        від {Math.round(daily.temperature_2m_min[dIdx])}°
                      </span>
                      <span className={styles.tempMax}>
                        до {Math.round(daily.temperature_2m_max[dIdx])}°
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className={styles.widgetsGrid}
            onClick={(e) => e.stopPropagation()}
          >
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
                За добу: {daily.precipitation_sum[activeIdx].toFixed(1)} мм
              </div>
            </div>
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
                {Math.round(daily.temperature_2m_mean[activeIdx])}°
              </div>
              <div className={styles.widgetDesc}>В середньому за добу</div>
            </div>
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
                    transform: `rotate(${current.wind_direction_10m + 180}deg)`,
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
                {Math.round(current.wind_direction_10m)}°
              </div>
            </div>
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
                {Math.round(current.relative_humidity_2m)}%
              </div>
              <div className={styles.widgetDesc}>
                Точка роси: {Math.round(current.dew_point_2m)}°
              </div>
            </div>
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
                {Math.round(current.visibility / 1000)}{" "}
                <span style={{ fontSize: "1rem" }}>км</span>
              </div>
              <div className={styles.widgetDesc}>Чисте небо</div>
            </div>
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
