import React, { useState, useEffect } from "react";
import { geoMercator, geoPath } from "d3-geo";
import * as topojson from "topojson-client";
import "./App.css";

function App() {
  const [geographies, setGeographies] = useState([]);
  const [hoveredRegion, setHoveredRegion] = useState("");

  useEffect(() => {
    fetch("/ukraine.json")
      .then((response) => response.json())
      .then((data) => {
        // МАГИЯ: Учим код понимать формат PowerBI
        if (data.type === "Topology") {
          // Если это TopoJSON, достаем ключи и распаковываем в обычный GeoJSON
          const objectKey = Object.keys(data.objects)[0];
          const unpackedData = topojson.feature(data, data.objects[objectKey]);
          setGeographies(unpackedData.features);
        } else {
          // Если это стандартный GeoJSON
          setGeographies(data.features || []);
        }
      })
      .catch((error) => console.error("Ошибка загрузки карты:", error));
  }, []);

  // Настройка центрирования карты на Украине
  const projection = geoMercator()
    .center([31.1656, 48.3794])
    .scale(3200)
    .translate([400, 300]);

  const pathGenerator = geoPath().projection(projection);

  return (
    <div className="app-container">
      {/* Видео пока закомментировано
      <video
        className="background-video"
        autoPlay
        loop
        muted
        playsInline
        src="твоя-ссылка-на-видео"
      />
      */}

      <div className="content-overlay">
        <h1 className="title">Погода в Україні</h1>

        <div className="tooltip">
          {hoveredRegion ? hoveredRegion : "Наведіть на область"}
        </div>

        <div className="map-container">
          {/* Рисуем карту */}
          <svg viewBox="0 0 800 600" width="100%" height="100%">
            {geographies.map((geo, index) => {
              // В разных картах ключи с именами разные. PowerBI часто использует shapeName
              const regionName =
                geo.properties.name ||
                geo.properties.NAME_1 ||
                geo.properties.shapeName ||
                `Область ${index}`;

              return (
                <path
                  key={index}
                  d={pathGenerator(geo)}
                  className="map-region"
                  onMouseEnter={() => setHoveredRegion(regionName)}
                  onMouseLeave={() => setHoveredRegion("")}
                  onClick={() => {
                    console.log("Кликнули по:", regionName);
                  }}
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default App;
