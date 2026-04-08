import React, { Suspense, lazy } from "react";
import { Toaster } from "react-hot-toast";
import styles from "./App.module.css";

const Map = lazy(() => import("./components/Map/Map"));
const FullModal = lazy(() => import("./components/FullModal/FullModal"));

function App() {
  return (
    <div className={styles.appContainer}>
      {/* <video className={styles.backgroundVideo} autoPlay loop muted playsInline src="..." /> */}
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
        containerStyle={{
          zIndex: 9999,
        }}
        toastOptions={{
          style: {
            background: "rgba(40, 40, 40, 0.5)",
            color: "#fff",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
          },
        }}
      />
    </div>
  );
}

export default App;
