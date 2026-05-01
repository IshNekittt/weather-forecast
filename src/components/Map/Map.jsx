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

  // Створюємо рядок SVG-шляху кордонів України для маски безпосередньо у Canvas
  const clipPathString = useMemo(() => {
    if (!projection || geographies.length === 0) return "";
    return geographies.map((geo) => pathGenerator(geo)).join(" ");
  }, [geographies, projection, pathGenerator]);

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
      {/* КАНВАС З ВІТРОМ (абсолютно позиційований, лежить під картою) */}
      {geographies.length > 0 && (
        <div className={styles.windCanvasContainer}>
          <WindOverlay
            width={VIEWBOX_WIDTH}
            height={VIEWBOX_HEIGHT}
            projection={projection}
            clipPathString={clipPathString}
          />
        </div>
      )}

      {/* SVG КАРТА */}
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className={styles.svgContainer}
      >
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

      {/* Обертка для віджета */}
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
