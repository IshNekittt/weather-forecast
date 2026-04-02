import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearRegion } from "../../store/appSlice";
import { useGetWeatherQuery } from "../../store/weatherApi";
import { X, Wind, Sun, Droplets, Gauge } from "lucide-react"; // Красивые иконки
import styles from "./BriefWidget.module.css";
import { skipToken } from "@reduxjs/toolkit/query";

const BriefWidget = () => {
  const dispatch = useDispatch();
  const region = useSelector((state) => state.app.selectedRegion);

  // RTK Query: Запрос отправляется только если есть lat/lon. И кэшируется на 1 час!
  const { data, isFetching, isError } = useGetWeatherQuery(
    region ? { lat: region.lat, lon: region.lon } : skipToken,
    { skip: !region }, // Если регион не выбран - скипаем запрос
  );

  // Твое условие: изначально модалка полностью скрыта
  if (!region) return null;

  return (
    <div
      className={styles.widgetContainer}
      // Точное позиционирование в пиксель области в процентах!
      style={{ left: `${region.xPercent}%`, top: `${region.yPercent}%` }}
    >
      <div className={styles.card}>
        <button
          className={styles.closeBtn}
          onClick={() => dispatch(clearRegion())}
        >
          <X size={18} />
        </button>

        {isFetching ? (
          <div className={styles.loading}>Завантаження...</div>
        ) : isError ? (
          <div className={styles.loading}>Помилка мережі</div>
        ) : data ? (
          <>
            <div className={styles.header}>{region.name}</div>
            <div className={styles.mainTemp}>
              {Math.round(data.current.temperature_2m)}°C
            </div>
            <div className={styles.feelsLike}>
              Відчувається як {Math.round(data.current.apparent_temperature)}°C
            </div>

            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <Wind size={14} />
                {data.current.wind_speed_10m} км/год
              </div>
              <div className={styles.detailItem}>
                <Sun size={14} />
                УФ: {data.current.uv_index}
              </div>
              <div className={styles.detailItem}>
                <Droplets size={14} />
                {data.current.relative_humidity_2m}%
              </div>
              <div className={styles.detailItem}>
                <Gauge size={14} />
                {Math.round(data.current.pressure_msl)} гПа
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default BriefWidget;
