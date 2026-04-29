import React, { useState, useEffect, Suspense, lazy } from "react";
import { useDispatch, useSelector } from "react-redux";
import { geoMercator, geoPath, geoCentroid } from "d3-geo";
import { setRegion, clearRegion } from "../../store/appSlice";
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

  const projection = geoMercator();
  if (geographies.length > 0) {
    projection.fitSize([VIEWBOX_WIDTH, VIEWBOX_HEIGHT], {
      type: "FeatureCollection",
      features: geographies,
    });
  }
  const pathGenerator = geoPath().projection(projection);

  const handleRegionClick = (geo, e) => {
    e.stopPropagation();
    const [lon, lat] = geoCentroid(geo);

    // Карта просто передает данные в Redux. Всю работу сделает BriefWidget.
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
      </svg>

      <Suspense fallback={null}>
        <div onClick={(e) => e.stopPropagation()}>
          <BriefWidget />
        </div>
      </Suspense>
    </div>
  );
};

export default Map;
