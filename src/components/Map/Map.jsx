import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { geoMercator, geoPath, geoCentroid } from "d3-geo";
import { setRegion } from "../../store/appSlice";
import BriefWidget from "../BriefWidget/BriefWidget";
import styles from "./Map.module.css";

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 600;

const Map = () => {
  const dispatch = useDispatch();
  const [geographies, setGeographies] = useState([]);

  useEffect(() => {
    fetch("/ukraine.geojson")
      .then((res) => res.json())
      .then((data) => setGeographies(data.features))
      .catch((err) => console.error("Помилка завантаження карти:", err));
  }, []);

  const projection = geoMercator();
  if (geographies.length > 0) {
    projection.fitSize([VIEWBOX_WIDTH, VIEWBOX_HEIGHT], {
      type: "FeatureCollection",
      features: geographies,
    });
  }
  const pathGenerator = geoPath().projection(projection);

  const handleRegionClick = (geo) => {
    // Получаем географические координаты (Долгота, Широта)
    const [lon, lat] = geoCentroid(geo);

    // МАГИЯ: Переводим географию в X и Y на нашем холсте
    const [x, y] = projection([lon, lat]);

    // Переводим в проценты, чтобы при ресайзе виджет стоял на месте!
    const xPercent = (x / VIEWBOX_WIDTH) * 100;
    const yPercent = (y / VIEWBOX_HEIGHT) * 100;

    dispatch(
      setRegion({
        name: geo.properties.name || geo.properties.NAME_1,
        lat,
        lon,
        xPercent,
        yPercent,
      }),
    );
  };

  return (
    <div className={styles.mapWrapper}>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className={styles.svgContainer}
      >
        {geographies.map((geo, index) => (
          <path
            key={index}
            d={pathGenerator(geo)}
            className={styles.mapRegion}
            onClick={() => handleRegionClick(geo)}
          />
        ))}
      </svg>

      {/* Виджет отрендерится ПОВЕРХ карты */}
      <BriefWidget />
    </div>
  );
};

export default Map;
