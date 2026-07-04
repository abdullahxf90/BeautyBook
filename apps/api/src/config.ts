export const config = {
  port: parseInt(process.env.API_PORT || "4000", 10),
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-only-refresh-secret",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  accessTokenTtl: "15m",
  refreshTokenTtlDays: 30,
};
