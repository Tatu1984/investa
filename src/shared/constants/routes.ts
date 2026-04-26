export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  assets: "/assets",
  asset: (symbol: string) => `/assets/${symbol}`,
  compare: "/compare",
  signals: "/signals",
  reports: "/reports",
  report: (date: string) => `/reports/${date}`,
  alerts: "/alerts",
  settings: "/settings",
} as const;
