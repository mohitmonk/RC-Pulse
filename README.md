# RC Pulse - RingCentral Personal Analytics Dashboard

**RC Pulse** is an enterprise-grade desktop analytics application engineered for RingCentral users to monitor, analyze, and gain actionable insights into their personal calling activity, presence, and extension performance.

## Key Features

- **Secure OAuth 2.0 Integration**: RingCentral Authorization Code Flow with PKCE, auto refresh tokens, and safe encrypted token storage.
- **Comprehensive Call Analytics**:
  - Key Performance Indicators: Total Calls, Inbound/Outbound breakdown, Missed vs Answered, Voicemail count, Avg Call Duration, Total Talk Time, Longest/Shortest call.
  - Calling Trends: Daily, Weekly, Monthly, Peak Calling Hours, and Call Duration distribution.
  - Contact Leaderboards: Top Contacts and Top Numbers call analytics.
- **Interactive Call Log Explorer**: Filterable, searchable, sortable call log table with direct call recording playback/links, direction badges, and detailed durations.
- **Flexible Time Filtering**: Today, Yesterday, This Week, Last Week, This Month, Last Month, This Quarter, Last Quarter, Last 6 Months, Last Year, and Custom Date Ranges.
- **Data Exporting**: One-click exports to formatted **Excel (.xlsx)** workbooks and **CSV** files.
- **Enterprise UI**: Dark luxury interface inspired by Linear, Stripe, Vercel, and Notion. Responsive charts built with Recharts, Zustand state management, and TanStack Query server caching.
- **Interactive Sandbox & Real API Mode**: Full support for real RingCentral Sandbox / Production credentials or instant interactive demo mode.

## Tech Stack

- **Desktop Runtime**: Electron 39+ & Node.js
- **Frontend**: React 19, TypeScript, Vite
- **State & Query**: Zustand, TanStack Query
- **Charts**: Recharts
- **Styling**: Tailwind CSS, Lucide React
- **Exporting**: ExcelJS, PapaParse
- **Date Utilities**: DayJS

## Architecture

The project follows SOLID principles, clean repository pattern, and service layer separation:
```
src/
  main/          # Electron Main Process (AuthManager, RingCentral SDK, Services, Encrypted Store)
    auth/
    ipc/
    services/
    utils/
  preload/       # Secure IPC Bridge (contextBridge)
  renderer/      # React 19 Renderer (Components, Layouts, Hooks, Stores, Pages)
    components/
    hooks/
    layouts/
    pages/
    store/
    styles/
    types/
```

## Running the Application

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build production bundle
npm run build
```
