import React, { useEffect, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import { useGetWindFieldQuery } from "../../store/weatherApi";

// Генеруємо сітку координат рівно 1 раз (щоб не перераховувати при ререндерах)
const LATS = [];
const LONS = [];
for (let lat = 44.5; lat <= 52.5; lat += 2) {
  for (let lon = 22; lon <= 41; lon += 3) {
    LATS.push(lat);
    LONS.push(lon);
  }
}
const LATS_STR = LATS.join(",");
const LONS_STR = LONS.join(",");

const WindOverlay = ({ width, height, projection }) => {
  const canvasRef = useRef(null);
  const isFullModalOpen = useSelector((state) => state.app.isFullModalOpen);

  // Отримуємо вітер через Redux (з автоматичним кешуванням в Session Storage)
  const { data: windData, isSuccess } = useGetWindFieldQuery(
    { lats: LATS_STR, lons: LONS_STR },
    { skip: !projection }, // Не робимо запит, поки проекція карти не готова
  );

  // ВИРІШЕННЯ ПРОБЛЕМИ: Використовуємо useMemo замість useState + useEffect.
  // Масив stations буде перерахований ТІЛЬКИ якщо windData або projection реально зміняться.
  // Ніяких зайвих ререндерів та безкінечних циклів.
  const stations = useMemo(() => {
    if (!isSuccess || !windData || !projection) return [];

    return windData.map((locationData, i) => {
      const speed = locationData.current.wind_speed_10m;
      const dir = locationData.current.wind_direction_10m;

      const [x, y] = projection([LONS[i], LATS[i]]);

      const angleRad = (dir + 90) * (Math.PI / 180);
      const scale = 0.05;
      const u = Math.cos(angleRad) * speed * scale;
      const v = Math.sin(angleRad) * speed * scale;

      return { x, y, u, v };
    });
  }, [windData, isSuccess, projection]);

  // Анімація частинок
  useEffect(() => {
    if (stations.length === 0 || !canvasRef.current) return;

    if (isFullModalOpen) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const PARTICLE_COUNT = 450;
    const MAX_AGE = 150;
    const particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        age: Math.random() * MAX_AGE,
      });
    }

    const draw = () => {
      // МАГІЯ ПРОЗОРОСТІ: замість малювання кольором, ми кажемо браузеру
      // "зроби все, що вже намальовано, на 15% прозорішим"
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)"; // Чим менше число, тим довші хвости
      ctx.fillRect(0, 0, width, height);

      // Повертаємо стандартний режим малювання для самих частинок
      ctx.globalCompositeOperation = "source-over";

      ctx.lineWidth = 1.1;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; // Світлі нитки вітру
      ctx.beginPath();

      particles.forEach((p) => {
        let sumU = 0,
          sumV = 0,
          sumWeight = 0;
        for (let i = 0; i < stations.length; i++) {
          const st = stations[i];
          const dx = p.x - st.x;
          const dy = p.y - st.y;
          const distSq = dx * dx + dy * dy;
          const weight = 1 / (distSq + 1000);
          sumU += st.u * weight;
          sumV += st.v * weight;
          sumWeight += weight;
        }

        const vx = sumU / sumWeight;
        const vy = sumV / sumWeight;

        ctx.moveTo(p.x, p.y);
        p.x += vx;
        p.y += vy;
        p.age += 1;
        ctx.lineTo(p.x, p.y);

        if (
          p.age > MAX_AGE ||
          p.x < 0 ||
          p.x > width ||
          p.y < 0 ||
          p.y > height
        ) {
          p.x = Math.random() * width;
          p.y = Math.random() * height;
          p.age = 0;
        }
      });

      ctx.stroke();
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [stations, width, height, isFullModalOpen]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export default WindOverlay;
