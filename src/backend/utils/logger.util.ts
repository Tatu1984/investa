import "server-only";
import pino from "pino";
import { env } from "@/config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { app: "investa-portal" },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      'password',
      "*.password",
      "*.passwordHash",
    ],
    censor: "[redacted]",
  },
  // Plain JSON logs everywhere. If you want pretty dev logs, add `pino-pretty` and pipe:
  //   npm run dev | npx pino-pretty
});

export type Logger = typeof logger;
