import fs from "fs";
import winston, { format } from "winston";
import "winston-daily-rotate-file";

function parseBooleanEnv(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }

  return normalized === "1" || normalized === "true" || normalized === "yes";
}

const logInConsole = parseBooleanEnv(process.env["LOG_CONSOLE"]);
const logLevel = process.env["LOG_LEVEL"] ?? "info";
const logFormat = process.env["LOG_FORMAT"] ?? "debug";
const logDir = process.env["LOG_DIR"] ?? "logs";

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const transports: winston.transport[] = [
  new winston.transports.DailyRotateFile({
    datePattern: "YYYY-MM-DD",
    dirname: logDir,
    filename: `%DATE%-${logFormat}.log`,
    format: format.combine(format.timestamp(), format.json()),
    level: logLevel,
    maxFiles: "7d",
  }),
];

if (logInConsole) {
  transports.push(
    new winston.transports.Console({
      format: format.combine(format.colorize(), format.simple()),
      level: logLevel,
    }),
  );
}

const logger = winston.createLogger({ transports });

export default logger;
