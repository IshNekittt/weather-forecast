import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearRegion, openFullModal } from "../../store/appSlice";
import { useGetWeatherQuery } from "../../store/weatherApi";
import { X, Wind, Sun, Droplets, Gauge } from "lucide-react";
import { getBackgroundVideoName } from "../../utils/weatherUtils";
import { skipToken } from "@reduxjs/toolkit/query";
import styles from "./BriefWidget.module.css";

const BriefWidget = () => {
  const dispatch = useDispatch();
  const { selectedRegion, isAiMode, aiCalculations } = useSelector(
    (state) => state.app,
  );

  // Зберігаємо URL відео, яке ВЖЕ завантажилось
  const [loadedVideoUrl, setLoadedVideoUrl] = useState(null);
  // Зберігаємо биті лінки
  const [failedUrls, setFailedUrls] = useState(new Set());

  const {
    data: apiData,
    isFetching,
    isError,
  } = useGetWeatherQuery(
    selectedRegion
      ? { lat: selectedRegion.lat, lon: selectedRegion.lon }
      : skipToken,
    { skip: !selectedRegion },
  );

  if (!selectedRegion) return null;

  const baseUrl = import.meta.env.VITE_VIDEO_BASE_URL;
  const fallbackUrl = `${baseUrl}Clear_Morning_No_Wind.mp4`;

  // 1. Формуємо ідеальне посилання
  let idealUrl = null;
  if (apiData) {
    const timeStr = apiData.current.time || new Date().toISOString();
    const videoName = getBackgroundVideoName(
      apiData.current.weather_code,
      apiData.current.wind_speed_10m,
      timeStr,
    );
    idealUrl = `${baseUrl}${videoName}.mp4`;
  }

  // 2. Вирішуємо, яке відео показувати
  let currentVideoUrl = idealUrl;
  if (failedUrls.has(idealUrl)) {
    currentVideoUrl = fallbackUrl;
  }
  if (failedUrls.has(fallbackUrl)) {
    currentVideoUrl = null;
  }

  // 3. Віджет показується, якщо актуальне відео співпадає з тим, що щойно завантажилось
  const showWidget =
    loadedVideoUrl === currentVideoUrl || !currentVideoUrl || isError;

  const displayData =
    isAiMode && aiCalculations[selectedRegion.name]
      ? aiCalculations[selectedRegion.name].data
      : apiData;

  return (
    <div
      className={styles.widgetContainer}
      style={{
        left: `${selectedRegion.xPercent}%`,
        top: `${selectedRegion.yPercent}%`,
      }}
    >
      <div
        className={styles.card}
        onClick={(e) => {
          e.stopPropagation();
          dispatch(openFullModal());
        }}
        style={{
          opacity: showWidget ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        {currentVideoUrl && (
          <video
            key={currentVideoUrl} // Ключ змушує React знищити старе відео і створити нове
            className={styles.cardVideo}
            autoPlay
            loop
            muted
            playsInline
            src={currentVideoUrl}
            // Як тільки завантажиться - зберігаємо його URL. showWidget стане true!
            onCanPlayThrough={() => setLoadedVideoUrl(currentVideoUrl)}
            onError={() => {
              setFailedUrls((prev) => new Set(prev).add(currentVideoUrl));
            }}
          />
        )}

        <button
          className={styles.closeBtn}
          onClick={(e) => {
            e.stopPropagation();
            dispatch(clearRegion());
          }}
        >
          <X size={18} />
        </button>

        {isFetching ? (
          <div className={styles.loading}>Завантаження...</div>
        ) : isError ? (
          <div className={styles.loading}>Помилка мережі</div>
        ) : displayData ? (
          <>
            <div className={styles.header}>{selectedRegion.name}</div>
            <div className={styles.mainTemp}>
              {Math.round(displayData.current.temperature_2m)}°C
            </div>
            <div className={styles.feelsLike}>
              Відчувається як{" "}
              {Math.round(displayData.current.apparent_temperature)}°C
            </div>

            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <Wind size={14} />
                {(displayData.current.wind_speed_10m / 3.6).toFixed(1)} м/с
              </div>
              <div className={styles.detailItem}>
                <Sun size={14} />
                УФ: {displayData.current.uv_index.toFixed(2)}
              </div>
              <div className={styles.detailItem}>
                <Droplets size={14} />
                {Math.round(displayData.current.relative_humidity_2m)}%
              </div>
              <div className={styles.detailItem}>
                <Gauge size={14} />
                {Math.round(displayData.current.pressure_msl)} гПа
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default BriefWidget;
