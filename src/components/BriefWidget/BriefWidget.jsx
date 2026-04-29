import React, { useState, useRef } from "react";
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

  const [isVideoReady, setIsVideoReady] = useState(false);
  const prevRegionRef = useRef(selectedRegion?.name);

  const { data: apiData } = useGetWeatherQuery(
    selectedRegion
      ? { lat: selectedRegion.lat, lon: selectedRegion.lon }
      : skipToken,
    { skip: !selectedRegion },
  );

  // СБРОС (без useEffect)
  if (selectedRegion?.name !== prevRegionRef.current) {
    prevRegionRef.current = selectedRegion?.name;
    if (isVideoReady) setIsVideoReady(false);
  }

  if (!selectedRegion || !apiData) return null;

  // ВЫЧИСЛЯЕМ URL НА ЛЕТУ (Никакого useState, никаких useEffect, никакой ошибки)
  const baseUrl = import.meta.env.VITE_VIDEO_BASE_URL;
  const videoName = getBackgroundVideoName(
    apiData.current.weather_code,
    apiData.current.wind_speed_10m,
    apiData.current.time || new Date().toISOString(),
  );
  const videoUrl = `${baseUrl}${videoName}.mp4`;
  const fallbackUrl = `${baseUrl}Clear_Morning_No_Wind.mp4`;

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
        onClick={() => dispatch(openFullModal())}
        style={{ opacity: isVideoReady ? 1 : 0, transition: "opacity 0.3s" }}
      >
        <video
          key={videoUrl} // Ключ заставляет плеер сброситься при смене URL
          className={styles.cardVideo}
          autoPlay
          loop
          muted
          playsInline
          src={videoUrl}
          onCanPlayThrough={() => setIsVideoReady(true)}
          onError={(e) => {
            if (e.target.src !== fallbackUrl) e.target.src = fallbackUrl;
            else {
              e.target.style.display = "none";
              setIsVideoReady(true);
            }
          }}
        />

        <button
          className={styles.closeBtn}
          onClick={(e) => {
            e.stopPropagation();
            dispatch(clearRegion());
          }}
        >
          <X size={18} />
        </button>

        <div className={styles.header}>{selectedRegion.name}</div>
        <div className={styles.mainTemp}>
          {Math.round(displayData.current.temperature_2m)}°C
        </div>
        <div className={styles.feelsLike}>
          Відчувається як {Math.round(displayData.current.apparent_temperature)}
          °C
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
      </div>
    </div>
  );
};

export default BriefWidget;
