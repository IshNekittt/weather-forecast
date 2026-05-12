# Weather Forecast

This project is a client-side web application for meteorological data analysis. The primary architectural goal was to shift heavy computational loads—such as vector field animation and mathematical weather forecasting—directly to the client browser. It is built with React 19 and bundled via Vite.

## System Architecture and Data Flow

Component interaction revolves around Redux Toolkit global state and the RTK Query caching layer. We avoided using local component states for weather data to prevent duplicate network requests when switching between widgets and modals.

```mermaid
graph TD
    subgraph UI Layer
        Map[Map Component SVG/D3]
        Widget[BriefWidget]
        Modal[FullModal]
    end

    subgraph State Management
        Store[Redux Store]
        Persist[SessionStorage Cache]
        API[RTK Query: weatherApi]
    end

    subgraph Data Processing
        AI[Local Model: aiForecastUtils]
    end

    User((User)) -->|Clicks region| Map
    Map -->|Dispatch lat/lon| Store
    Store -->|Subscribe to coordinates| API
    API <-->|Read/Write Cache| Persist
    API -->|HTTP GET| OpenMeteo[(Open-Meteo API)]

    OpenMeteo -->|Actual data + 120h history| API
    API --> Widget
    API --> Modal

    Modal -->|Toggle AI Mode| Store
    API -->|Pass 120h array| AI
    AI -->|Calculate 24h forecast| Store
    Store -->|Substitute data source| Modal
```

## Rendering Subsystem (D3.js + Canvas)

The map rendering is split into two layers: a static SVG for handling polygon click events and a Canvas for drawing the wind particle flow.

Our biggest performance bottleneck during development was mobile devices (specifically Safari on iOS). Calling the `clip()` method to constrain 450 moving particles strictly within the country borders on every frame (60 FPS) overloaded the main thread.

**The Offscreen Canvas Solution:**
We moved the mask generation to a separate canvas that exists only in memory.

```mermaid
sequenceDiagram
    participant Main as Main Canvas (Screen)
    participant Offscreen as Offscreen Canvas (Memory)
    participant DOM as Browser

    Note over Offscreen: Executes once on load
    Offscreen->>Offscreen: Draw white mask (clipPathString)

    loop Every frame (requestAnimationFrame)
        Main->>Main: Calculate vectors for 450 particles (X, Y, U, V)
        Main->>Main: Draw particle trajectories
        Main->>Offscreen: Apply via globalCompositeOperation = "destination-in"
        Offscreen-->>Main: Clip particles outside borders
        Main->>DOM: Render frame
    end
```

Additionally, the animated cloud background (`App.module.css`) relies solely on `transform: translate3d` and `will-change`. We intentionally removed `box-shadow` and `filter: blur`, replacing them with geometric `::before` and `::after` pseudo-elements. This forces the browser to delegate layer rendering to the GPU.

## Forecasting Mathematical Model (AI Mode)

The algorithm in `utils/aiForecastUtils.js` generates forecasts without requesting data from a backend. It is not a neural network, but a mathematical model utilizing linear regression and exponential smoothing.

```mermaid
flowchart LR
    Data[(API Archive: last 120h)] --> Trend[Linear Regression]
    Data --> Season[Diurnal Seasonality]

    Trend --> |Base Trend| Merge(Forecast Aggregation)
    Season --> |Calculate Deviations| Smooth[Exponential Smoothing]
    Smooth --> |weight = 1/daysAgo| Merge

    Merge --> |Temperature, Pressure, Humidity| Heuristics[Heuristics Engine]

    Heuristics --> |Pressure drops| Rules{Calculate Derivatives}
    Heuristics --> |Humidity spikes| Rules

    Rules --> |Precipitation Probability %| Output[24h Local Forecast]
    Rules --> |WMO Weather Code| Output
```

**How the algorithm works:**

1. **Global Trend:** `regression.js` calculates a straight trend line using the Ordinary Least Squares method for each parameter.
2. **Seasonality:** Linear regression ignores daily cycles (nights are colder than days). To compensate, the script calculates the difference between the trend line and the actual data at the _exact same hour coordinate_ on previous days.
3. **Weights:** We apply the formula `weight = 1 / daysAgo`. A deviation from the trend recorded yesterday (weight 1) contributes more heavily to the forecast than data from five days ago (weight 0.2).
4. **Derivatives:** Derived parameters like precipitation probability are calculated via physics-based `if/else` logic (e.g., high humidity + rapid pressure drop = rain).

The model has limitations and can miscalculate during sudden atmospheric front shifts, but it handles inertial weather changes reliably.
