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
        <Toaster position="bottom-center" />
      </div>

      <Suspense fallback={null}>
        <FullModal />
      </Suspense>
    </div>
  );
}

export default App;
