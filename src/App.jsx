import React, { useState, useEffect } from "react";
import { geoMercator, geoPath, geoCentroid } from "d3-geo"; // Добавили geoCentroid
import "./App.css";

function App() {
  const [geographies, setGeographies] = useState([]);
  const [hoveredRegion, setHoveredRegion] = useState("");
  const [weather, setWeather] = useState(null); // Сюда сохраним данные о погоде
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/ukraine.geojson") // Убедись, что файл называется так
      .then((res) => res.json())
      .then((data) => setGeographies(data.features))
      .catch((err) => console.error("Ошибка загрузки карты:", err));
  }, []);

  const projection = geoMercator();
  if (geographies.length > 0) {
    projection.fitSize([800, 600], {
      type: "FeatureCollection",
      features: geographies,
    });
  }
  const pathGenerator = geoPath().projection(projection);

  // --- ЛОГИКА ПОГОДЫ ---
  const handleRegionClick = async (geo) => {
    setLoading(true);
    setWeather(null); // Сброс старых данных

    // 1. Находим центр области (координаты для API)
    const [lon, lat] = geoCentroid(geo);
    const regionName = geo.properties.name || geo.properties.NAME_1;

    try {
      // 2. Запрос к Open-Meteo (Текущая погода + прогноз на 10 дней + УФ индекс + давление)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto&forecast_days=10`;

      const response = await fetch(url);
      const data = await response.json();

      if (data) {
        setWeather({
          name: regionName,
          current: data.current,
          daily: data.daily,
          hourly: data.hourly,
        });
      }
    } catch (error) {
      alert("Не вдалося завантажити дані про погоду");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* <video className="background-video" autoPlay loop muted playsInline src="..." /> */}

      <div className="content-overlay">
        <h1 className="title">Погода в Україні</h1>

        <div className="map-container">
          <svg viewBox="0 0 800 600" width="100%" height="100%">
            {geographies.map((geo, index) => (
              <path
                key={index}
                d={pathGenerator(geo)}
                className="map-region"
                onMouseEnter={() =>
                  setHoveredRegion(geo.properties.name || geo.properties.NAME_1)
                }
                onMouseLeave={() => setHoveredRegion("")}
                onClick={() => handleRegionClick(geo)}
              />
            ))}
          </svg>
        </div>

        {/* --- ВИДЖЕТ ПОГОДЫ (ВСПЛЫВАЮЩИЙ) --- */}
        <div className="weather-card">
          {loading && <p>Завантаження...</p>}

          {!loading && weather ? (
            <div className="weather-info">
              <h2>{weather.name}</h2>
              <div className="weather-main">
                <span className="temp">
                  {Math.round(weather.current.temperature_2m)}°C
                </span>
                <p>
                  Відчувається як{" "}
                  {Math.round(weather.current.apparent_temperature)}°C
                </p>
              </div>
              <div className="weather-details">
                <p>💨 Вітер: {weather.current.wind_speed_10m} км/год</p>
                <p>☀️ UV-індекс: {weather.current.uv_index}</p>
                <p>💧 Вологість: {weather.current.relative_humidity_2m}%</p>
                <p>⏲️ Тиск: {weather.current.pressure_msl} гПа</p>
              </div>
              <button className="close-btn" onClick={() => setWeather(null)}>
                ✕
              </button>
            </div>
          ) : (
            <div className="tooltip">{hoveredRegion || "Оберіть область"}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
