# SL Commute Dashboard

A personal commute dashboard for Stockholm public transit (SL). Answers one question instantly:

> **If I leave now, what do I catch and when will I arrive?**

## Features

- **Leave-now logic**: Shows when you need to leave to catch each trip
- **Trip proposals**: Displays 1-3 upcoming trip options per commute
- **Real-time departures**: Optional departure board for your stations
- **Service alerts**: Shows disruptions and delays
- **E-ink ready**: High contrast, no animations, large text
- **Kiosk mode**: Full-screen display mode for wall-mounted screens

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. Open the app and click "Get Started" or go to `/setup`
2. Add your places (Home, Work, stations)
3. Create commutes between your places
4. Return to the dashboard to see your trip options

### Finding Place IDs

When adding a place, use the search feature to find stops:
- Type a station name (e.g., "Odenplan")
- Select from the results to auto-fill IDs

### Display Modes

- **Dashboard** (`/`): Normal view with all features
- **Kiosk** (`/?kiosk=1`): Simplified view for always-on displays
- **Display** (`/display`): Full-screen e-ink optimized view

## Configuration

All configuration is stored in `localStorage` under `sl-commute-config`.

### Export/Import

Go to Setup → Settings to:
- Export your config as JSON backup
- Import a previously exported config

### Sample Config

```json
{
  "version": 1,
  "places": [
    {
      "id": "home",
      "label": "Home",
      "coord": { "lat": 59.3293, "lon": 18.0686 },
      "journeyPlannerLocationId": "9091001000009182",
      "transportSiteId": "9182",
      "prepSeconds": 120
    },
    {
      "id": "work",
      "label": "Work",
      "coord": { "lat": 59.3345, "lon": 18.0567 },
      "journeyPlannerLocationId": "9091001000009192",
      "transportSiteId": "9192",
      "prepSeconds": 60
    }
  ],
  "commutes": [
    {
      "id": "morning",
      "label": "Morning commute",
      "originPlaceId": "home",
      "destinationPlaceId": "work",
      "modes": { "bus": true, "metro": true, "train": true, "tram": true, "ship": true },
      "bufferSeconds": 120,
      "maxTrips": 3
    }
  ],
  "settings": {
    "refreshIntervalSeconds": 120,
    "theme": "light",
    "showDepartureBoards": true,
    "showDeviations": true
  }
}
```

## APIs Used

This app uses SL's public APIs (no API key required):

- **Journey Planner v2**: Trip planning and stop search
- **SL Transport**: Departure boards and site data
- **SL Deviations**: Service disruptions

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router

## Deployment

Build and deploy the `dist` folder to any static hosting:

```bash
npm run build
# Deploy dist/ to your server
```

Works with:
- Coolify (Nginx container)
- Vercel
- Netlify
- Any static file server

## E-ink Display Integration

The app is designed to work well with e-ink displays:

1. Use `/display` route for maximum readability
2. Set long refresh intervals (5+ minutes) to reduce redraws
3. Use a headless browser to screenshot and push to e-ink

## License

MIT
