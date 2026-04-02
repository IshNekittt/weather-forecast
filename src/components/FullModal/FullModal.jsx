import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearRegion } from "../../store/appSlice";
import { useGetWeatherQuery } from "../../store/weatherApi";
import {
  getWeatherProps,
  getNext24Hours,
  capitalize,
} from "../../utils/weatherUtils";
import {
  X,
  CalendarDays,
  Clock,
  SunDim,
  Wind,
  Droplets,
  Eye,
  Gauge,
} from "lucide-react";
import { skipToken } from "@reduxjs/toolkit/query";
import styles from "./FullModal.module.css";

const FullModal = () => {
  const dispatch = useDispatch();
  const { selectedRegion, isFullModalOpen } = useSelector((state) => state.app);

  const { data } = useGetWeatherQuery(
    selectedRegion
      ? { lat: selectedRegion.lat, lon: selectedRegion.lon }
      : skipToken,
    { skip: !selectedRegion },
  );

  if (!isFullModalOpen || !data) return null;

  const { current, daily, hourly } = data;
  const currentProps = getWeatherProps(current.weather_code);
  const hourly24 = getNext24Hours(hourly);

  const uvPercent = Math.min((current.uv_index / 11) * 100, 100);

  const minP = 970;
  const maxP = 1050;
  const currentP = Math.max(minP, Math.min(maxP, current.pressure_msl));
  const pressurePercent = (currentP - minP) / (maxP - minP);
  // Шкала 270 градусов
  const pressureRotation = -135 + pressurePercent * 270;

  return (
    <div className={styles.modalOverlay}>
      <button
        className={styles.closeBtn}
        onClick={() => dispatch(clearRegion())}
      >
        <X size={24} />
      </button>

      <div className={styles.content}>
        {/* ХЕДЕР */}
        <div className={styles.header}>
          <h1 className={styles.regionName}>{selectedRegion.name}</h1>
          <div className={styles.currentTemp}>
            {Math.round(current.temperature_2m)}°
          </div>
          <div className={styles.condition}>{currentProps.text}</div>
          <div className={styles.highLow}>
            Макс.: {Math.round(daily.temperature_2m_max[0])}°, Мін.:{" "}
            {Math.round(daily.temperature_2m_min[0])}°
          </div>
        </div>

        {/* ПРОГНОЗ 24 ГОДИНИ */}
        <div className={styles.glassPanel}>
          <div className={styles.panelTitle}>
            <Clock size={14} /> Прогноз на 24 години
          </div>
          <div className={styles.hourlyScroll}>
            {hourly24.map((hour, i) => (
              <div key={i} className={styles.hourBlock}>
                <span className={styles.hourTime}>{hour.time}</span>
                {getWeatherProps(hour.code).icon}
                <span className={styles.hourTemp}>{hour.temp}°</span>
              </div>
            ))}
          </div>
        </div>

        {/* ПРОГНОЗ 10 ДНІВ */}
        <div className={styles.glassPanel}>
          <div className={styles.panelTitle}>
            <CalendarDays size={14} /> Прогноз на 10 днів
          </div>
          {daily.time.map((dateString, i) => {
            const date = new Date(dateString);
            const dayName =
              i === 0
                ? "Сьогодні"
                : capitalize(
                    date.toLocaleDateString("uk-UA", { weekday: "short" }),
                  );
            return (
              <div key={i} className={styles.dailyRow}>
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

        {/* СЕТКА ВИДЖЕТОВ */}
        <div className={styles.widgetsGrid}>
          {/* УФ-ІНДЕКС */}
          <div className={`${styles.glassPanel} ${styles.squareWidget}`}>
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

          {/* ВІТЕР */}
          <div className={`${styles.glassPanel} ${styles.squareWidget}`}>
            <div className={styles.panelTitle}>
              <Wind size={14} /> ВІТЕР
            </div>
            <div className={styles.compassContainer}>
              {/* Буквы направлений */}
              <span className={styles.compassMark} style={{ top: "2px" }}>
                ПН
              </span>
              <span className={styles.compassMark} style={{ bottom: "2px" }}>
                ПД
              </span>
              <span className={styles.compassMark} style={{ left: "4px" }}>
                З
              </span>
              <span className={styles.compassMark} style={{ right: "4px" }}>
                С
              </span>

              {/* КАСТОМНАЯ СТРЕЛКА-ИГЛА С ШИРОКИМ НАКОНЕЧНИКОМ */}
              <svg
                width="80"
                height="80"
                viewBox="0 0 100 100"
                style={{
                  transform: `rotate(${current.wind_direction_10m}deg)`,
                  position: "absolute",
                  overflow: "visible",
                }}
              >
                {/*
         Наконечник:
         M 50 20 (верхушка, отступ 20px от края)
         L 44 42 (левый угол, ширина 12px)
         L 50 38 (внутренний прогиб для динамики)
         L 56 42 (правый угол)
      */}
                <path
                  d="M 50 20 L 44 42 L 50 38 L 56 42 Z"
                  fill="white"
                  stroke="white"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />

                {/*
         Тонкое тело стрелки (хвост):
         От 40 до 80 (отступ 20px от нижнего края Пд)
      */}
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

            {/* Данные внизу: скорость и градусы */}
            <div className={styles.widgetDesc} style={{ textAlign: "center" }}>
              {current.wind_speed_10m} км/год • {current.wind_direction_10m}°
            </div>
          </div>

          {/* ВОЛОГІСТЬ */}
          <div className={`${styles.glassPanel} ${styles.squareWidget}`}>
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

          {/* ВИДИМІСТЬ */}
          <div className={`${styles.glassPanel} ${styles.squareWidget}`}>
            <div className={styles.panelTitle}>
              <Eye size={14} /> ВИДИМІСТЬ
            </div>
            <div className={styles.widgetValue}>
              {(current.visibility / 1000).toFixed(0)}{" "}
              <span style={{ fontSize: "1rem" }}>км</span>
            </div>
            <div className={styles.widgetDesc}>Чисте небо</div>
          </div>

          {/* ТИСК (270 ГРАДУСІВ + РИСКА + ОДИНИЦІ ВИМІРУ) */}
          <div
            className={`${styles.glassPanel} ${styles.squareWidget} ${styles.pressureWidget}`}
          >
            <div
              className={styles.panelTitle}
              style={{ position: "absolute", top: "15px", left: "20px" }}
            >
              <Gauge size={14} /> ТИСК
            </div>

            <div className={styles.pressureContainer}>
              <svg viewBox="0 0 100 100" className={styles.pressureSvg}>
                {/* Дуга 270 градусов */}
                <path
                  d="M 21.7 78.3 A 40 40 0 1 1 78.3 78.3"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                {/* РИСКА (Индикатор) */}
                <g transform={`translate(50, 50) rotate(${pressureRotation})`}>
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

              {/* ЦЕНТРАЛЬНИЙ БЛОК З ЧИСЛОМ ТА ОДИНИЦЯМИ */}
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
  );
};

export default FullModal;
