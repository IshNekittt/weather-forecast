import React from "react";
import { Toaster } from "react-hot-toast";
import Map from "./components/Map/Map";
import styles from "./App.module.css";

function App() {
  return (
    <div className={styles.appContainer}>
      {/* <video className={styles.backgroundVideo} autoPlay loop muted playsInline src="..." /> */}

      <div className={styles.contentOverlay}>
        <Map />
        <Toaster position="bottom-center" />
      </div>
    </div>
  );
}

export default App;
