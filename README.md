# Ishnekittt Weather Forecast

An interactive weather forecasting web application built with React 19 and Vite. The project stands out with its custom meteorological map rendering engine featuring live wind particles, dynamic video backgrounds, and a **client-side AI mathematical model** that calculates local weather forecasts entirely in the browser.

## 🚀 Key Features

- **Interactive SVG/Canvas Map:** Renders geographical regions using D3.js overlaid with a real-time particle simulation of wind flows.
- **Dynamic Video Environment:** The application's background seamlessly transitions between videos corresponding to the selected region's live weather conditions.
- **Deep Analytics:** Custom SVG components visualize UV Index, atmospheric pressure (gauge), relative humidity, and sun phases.
- **Local AI Forecast:** An alternative mathematical forecasting mode running completely client-side without third-party servers, powered by linear regression.
- **Extreme Optimization:** Leverages GPU-accelerated CSS animations for background clouds and Offscreen Canvas rendering for complex particle masking.

## 🧩 Architecture & Component Interaction

The application follows a strict component-based architecture with centralized state management handled by **Redux Toolkit** and **RTK Query**.

### Data Flow Diagram:

1. **Initialization (`App.jsx`):** Renders the animated geometric cloud background and mounts the `Map` component.
2. **Map Interaction:** Clicking an SVG polygon triggers `d3-geo` to calculate the region's centroid. The Redux Dispatcher updates the `selectedRegion` payload in `appSlice`.
3. **Data Layer Reactivity:** RTK Query (`weatherApi`) reacts to coordinate changes and fetches the comprehensive data payload (current, hourly, 10-day, and 5-day historical) from the Open-Meteo API.
4. **Widget Render:** The `BriefWidget` animates in, displaying immediate weather parameters while prefetching the associated background video.
5. **Deep Dive (`FullModal`):** Opening the detailed modal exposes temporal metrics, 10-day lists, interactive gauges, and the "AI Mode" toggle.

### State Management

- **`appSlice`**: Manages UI state (`selectedRegion`, `isFullModalOpen`) and caches the heavy calculations from the AI model (`aiCalculations`).
- **`redux-persist`**: Bound to `sessionStorage` to persist the RTK Query cache across page reloads, dramatically minimizing network overhead.

## 🧠 The AI Forecasting Model

One of the most complex implementations in this project is `utils/aiForecastUtils.js`, which serves as a backend-less forecasting algorithm.

**How it works:**
The algorithm extracts an array of actual weather data covering the last **120 hours** (5 days) and generates a prediction for the next **24 hours** using two core mathematical principles:

1. **Global Trend (Linear Regression):**
   Using the `regression` library, it analyzes the 120 data points for every metric (temperature, pressure, etc.) to establish a baseline trend using the Ordinary Least Squares (OLS) method.

2. **Exponential Smoothing of Diurnal Seasonality:**
   Weather is cyclical (warm during the day, cold at night), which linear regression fails to capture natively. The algorithm calculates the deviation between the trendline and the actual historical data at the **exact same hour** in previous days (24, 48, 72 hours ago).
   An exponential weight function is applied: `weight = 1 / daysAgo`. A deviation observed yesterday (weight = 1) affects the final forecast much more than a deviation observed 5 days ago (weight = 0.2). Final Prediction = Trend + Weighted Average Deviation.

3. **Heuristic Derivative Calculation:**
   Metrics like precipitation probability and WMO weather codes are determined via derivative heuristics (e.g., pressure drops combined with humidity spikes).

## ⚡ Optimization Techniques

- **Offscreen Canvas Masking (`WindOverlay.jsx`):** To restrict wind particles within the country borders, a complex SVG path (`clipPath`) is utilized. Instead of invoking the highly expensive `clip()` method on the main thread during every animation frame, the mask is drawn **once** to a virtual `maskCanvas` and applied using `globalCompositeOperation = "destination-in"`. This eradicates severe frame drops, particularly on iOS devices.
- **Hardware Acceleration (`App.module.css`):** The background clouds are animated strictly via `transform: translate3d`. Their shapes are built via pseudo-elements without `box-shadow` or `filter: blur`, ensuring the GPU can composite layers independently (enforced via `will-change: transform`).
- **Lazy Loading:** Modals and dynamic widgets are loaded asynchronously via `React.lazy` and `Suspense`.

## 🛠 Tech Stack

- **Core:** React 19, Vite (React Compiler enabled)
- **State Management:** Redux Toolkit, RTK Query, Redux Persist
- **Math & Geospatial:** d3-geo, regression, suncalc
- **Styling:** CSS Modules, clsx
