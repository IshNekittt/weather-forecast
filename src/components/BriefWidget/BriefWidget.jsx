import React, { useState, useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearRegion, openFullModal } from "../../store/appSlice";
import { useGetWeatherQuery } from "../../store/weatherApi";
import { X, Wind, Sun, Droplets, Gauge } from "lucide-react";
import { getBackgroundVideoName } from "../../utils/weatherUtils";
import { skipToken } from "@reduxjs/toolkit/query";
import clsx from "clsx";
import toast from "react-hot-toast";
import styles from "./BriefWidget.module.css";

const BriefWidget = () => {
  const dispatch = useDispatch();
  const selectedRegion = useSelector((state) => state.app.selectedRegion);
  const isAiMode = useSelector((state) => state.app.isAiMode);
  const aiCalculations = useSelector((state) => state.app.aiCalculations);

  const [activeRegion, setActiveRegion] = useState(null);
  const [loadedVideoUrl, setLoadedVideoUrl] = useState(null);
  const [failedUrls, setFailedUrls] = useState(new Set());

  // --- ДИНАМІЧНИЙ СТАН ---
  const isExiting =
    activeRegion &&
    (!selectedRegion || selectedRegion.name !== activeRegion.name);

  if (!activeRegion && selectedRegion) {
    setActiveRegion(selectedRegion);
  }

  // Предзавантаження для Redux (selected)
  const { data: targetData, isFetching: isTargetLoading } = useGetWeatherQuery(
    selectedRegion
      ? { lat: selectedRegion.lat, lon: selectedRegion.lon }
      : skipToken,
  );
  // Дані для того, що бачимо (active)
  const { data: activeData } = useGetWeatherQuery(
    activeRegion ? { lat: activeRegion.lat, lon: activeRegion.lon } : skipToken,
  );

  const targetVideoUrl = useMemo(() => {
    if (!targetData || !selectedRegion) return null;
    const { current } = targetData;
    const baseUrl = import.meta.env.VITE_VIDEO_BASE_URL;
    const name = getBackgroundVideoName(
      current.weather_code,
      current.wind_speed_10m,
      current.time,
    );
    const url = `${baseUrl}${name}.mp4`;
    return failedUrls.has(url) ? `${baseUrl}Clear_Morning_No_Wind.mp4` : url;
  }, [targetData, selectedRegion, failedUrls]);

  const activeVideoUrl = useMemo(() => {
    if (!activeData || !activeRegion) return null;
    const { current } = activeData;
    const baseUrl = import.meta.env.VITE_VIDEO_BASE_URL;
    const name = getBackgroundVideoName(
      current.weather_code,
      current.wind_speed_10m,
      current.time,
    );
    const url = `${baseUrl}${name}.mp4`;
    return failedUrls.has(url) ? `${baseUrl}Clear_Morning_No_Wind.mp4` : url;
  }, [activeData, activeRegion, failedUrls]);

  const displayVideoUrl = isExiting ? activeVideoUrl : targetVideoUrl;
  const isNextReady =
    targetData &&
    !isTargetLoading &&
    (loadedVideoUrl === targetVideoUrl || !targetVideoUrl);

  const handleAnimationEnd = (e) => {
    if (e.animationName.includes("popOut")) {
      setActiveRegion(selectedRegion);
      if (targetVideoUrl !== loadedVideoUrl) setLoadedVideoUrl(null);
    }
  };

  useEffect(() => {
    if (selectedRegion && !isNextReady && !isExiting) {
      toast.loading("Завантаження...", { id: "brief-load" });
    } else {
      toast.dismiss("brief-load");
    }
  }, [selectedRegion, isNextReady, isExiting]);

  if (!activeRegion) return null;

  // Відображаємо дані АКТИВНОГО регіону (навіть під час анімації виходу)
  const displayData =
    isAiMode && aiCalculations[activeRegion.name]
      ? aiCalculations[activeRegion.name].data
      : activeData;

  const current = displayData?.current;

  return (
    <div
      className={clsx(
        styles.widgetContainer,
        !isExiting &&
          activeRegion.name === selectedRegion?.name &&
          isNextReady &&
          styles.popIn,
        isExiting && styles.popOut,
      )}
      style={{
        left: `${activeRegion.xPercent}%`,
        top: `${activeRegion.yPercent}%`,
      }}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        className={styles.card}
        onClick={(e) => {
          e.stopPropagation();
          dispatch(openFullModal());
        }}
      >
        {displayVideoUrl && (
          <video
            key={displayVideoUrl}
            className={styles.cardVideo}
            autoPlay
            loop
            muted
            playsInline
            src={displayVideoUrl}
            onCanPlayThrough={() => setLoadedVideoUrl(displayVideoUrl)}
            onError={() =>
              setFailedUrls((prev) => new Set(prev).add(displayVideoUrl))
            }
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

        {/* ПРАВКА: прибрано !isExiting, щоб контент не зникав під час анімації */}
        {current && (
          <>
            <div className={styles.header}>{activeRegion.name}</div>
            <div className={styles.mainTemp}>
              {Math.round(current.temperature_2m)}°C
            </div>
            <div className={styles.feelsLike}>
              Відчувається як {Math.round(current.apparent_temperature)}°C
            </div>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <Wind size={14} /> {(current.wind_speed_10m / 3.6).toFixed(1)}{" "}
                м/с
              </div>
              <div className={styles.detailItem}>
                <Sun size={14} /> УФ: {current.uv_index.toFixed(2)}
              </div>
              <div className={styles.detailItem}>
                <Droplets size={14} />{" "}
                {Math.round(current.relative_humidity_2m)}%
              </div>
              <div className={styles.detailItem}>
                <Gauge size={14} /> {Math.round(current.pressure_msl)} гПа
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BriefWidget;
