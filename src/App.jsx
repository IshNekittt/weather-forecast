import React, { Suspense, lazy } from "react";
import { Toaster } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux"; // Додали useSelector
import { clearRegion } from "./store/appSlice";
import clsx from "clsx"; // У тебе в package.json є ця бібліотека
import styles from "./App.module.css";

const Map = lazy(() => import("./components/Map/Map"));
const FullModal = lazy(() => import("./components/FullModal/FullModal"));

function App() {
  const dispatch = useDispatch();
  // Отримуємо стан модалки
  const isFullModalOpen = useSelector((state) => state.app.isFullModalOpen);

  return (
    <div
      className={styles.appContainer}
      onClick={() => dispatch(clearRegion())}
    >
      {/* Додаємо клас paused, якщо модалка відкрита */}
      <div
        className={clsx(
          styles.auroraBackground,
          isFullModalOpen && styles.paused,
        )}
      >
        <div className={`${styles.meshBand} ${styles.bandIndigo}`}></div>
        <div className={`${styles.meshBand} ${styles.bandElectric}`}></div>
        <div className={`${styles.meshBand} ${styles.bandDeep}`}></div>
        <div className={`${styles.meshBand} ${styles.bandOrangeA}`}></div>
        <div className={`${styles.meshBand} ${styles.bandOrangeB}`}></div>
      </div>

      <div className={styles.contentOverlay}>
        <Suspense
          fallback={<div style={{ color: "white" }}>Завантаження карти...</div>}
        >
          <Map />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <FullModal />
      </Suspense>

      <Toaster
        position="top-center"
        containerStyle={{ zIndex: 9999999 }}
        toastOptions={{
          duration: 3000,
          style: {
            background: "rgba(30, 30, 30, 0.9)",
            color: "#fff",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          },
        }}
      />
    </div>
  );
}

export default App;
