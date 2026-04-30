import React, { useState, useEffect, Suspense, lazy, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { geoMercator, geoPath, geoCentroid } from "d3-geo";
import { setRegion, clearRegion } from "../../store/appSlice";
import WindOverlay from "./WindOverlay";
import styles from "./Map.module.css";

const BriefWidget = lazy(() => import("../BriefWidget/BriefWidget"));

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 600;

const Map = () => {
  const dispatch = useDispatch();
  const selectedRegion = useSelector((state) => state.app.selectedRegion);
  const [geographies, setGeographies] = useState([]);

  useEffect(() => {
    fetch("/ukraine.geojson")
      .then((res) => res.json())
      .then((data) => setGeographies(data.features))
      .catch((err) => console.error(err));
  }, []);

  // useMemo обов'язковий, щоб не викликати нескінченні запити вітру
  const projection = useMemo(() => {
    const proj = geoMercator();
    if (geographies.length > 0) {
      proj.fitSize([VIEWBOX_WIDTH, VIEWBOX_HEIGHT], {
        type: "FeatureCollection",
        features: geographies,
      });
    }
    return proj;
  }, [geographies]);

  const pathGenerator = geoPath().projection(projection);

  const handleRegionClick = (geo, e) => {
    e.stopPropagation();
    const [lon, lat] = geoCentroid(geo);
    dispatch(
      setRegion({
        name: geo.properties.name || geo.properties.NAME_1,
        lat,
        lon,
        xPercent: (projection([lon, lat])[0] / VIEWBOX_WIDTH) * 100,
        yPercent: (projection([lon, lat])[1] / VIEWBOX_HEIGHT) * 100,
      }),
    );
  };

  return (
    <div className={styles.mapWrapper} onClick={() => dispatch(clearRegion())}>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className={styles.svgContainer}
      >
        {/* 1. СТВОРЮЄМО МАСКУ (Силует України) */}
        <defs>
          <clipPath id="ukraine-clip">
            {geographies.map((geo, index) => (
              <path key={`clip-${index}`} d={pathGenerator(geo)} />
            ))}
          </clipPath>
        </defs>

        {/* 2. КАНВАС З ВІТРОМ (Обрізаний по масці, лежить під областями) */}
        {/* КАНВАС З ВІТРОМ */}
        {geographies.length > 0 && (
          <g clipPath="url(#ukraine-clip)">
            <foreignObject
              x="0"
              y="0"
              width={VIEWBOX_WIDTH}
              height={VIEWBOX_HEIGHT}
              style={{ pointerEvents: "none", background: "transparent" }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "transparent",
                }}
              >
                <WindOverlay
                  width={VIEWBOX_WIDTH}
                  height={VIEWBOX_HEIGHT}
                  projection={projection}
                />
              </div>
            </foreignObject>
          </g>
        )}

        {/* 3. ОБЛАСТІ ДЛЯ КЛІКІВ (Лежать зверху, напівпрозорі) */}
        <g>
          {geographies.map((geo, index) => {
            const isSelected =
              selectedRegion &&
              selectedRegion.name ===
                (geo.properties.name || geo.properties.NAME_1);
            return (
              <path
                key={index}
                d={pathGenerator(geo)}
                className={`${styles.mapRegion} ${isSelected ? styles.selectedRegion : ""}`}
                onClick={(e) => handleRegionClick(geo, e)}
              />
            );
          })}
        </g>
      </svg>

      {/* Обертка для віджета (pointerEvents: none, щоб кліки проходили крізь неї на карту) */}
      <Suspense fallback={null}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <BriefWidget />
        </div>
      </Suspense>
    </div>
  );
};

export default Map;
