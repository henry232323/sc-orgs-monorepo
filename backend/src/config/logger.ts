import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  // Use LOG_LEVEL environment variable if set, otherwise default based on NODE_ENV
  const logLevel = process.env.LOG_LEVEL;
  if (logLevel && ['error', 'warn', 'info', 'http', 'debug'].includes(logLevel)) {
    return logLevel;
  }
  
  // Default behavior based on NODE_ENV
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format for console logs (with JSON serialization for objects)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(info => {
    const { timestamp, level, message, ...rest } = info;
    let output = `${timestamp} ${level}: ${message}`;

    // If there are additional parameters, serialize them as JSON
    if (Object.keys(rest).length > 0) {
      output += ` ${JSON.stringify(rest)}`;
    }

    return output;
  })
);

// Define format for file logs (JSON format)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport with custom format
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // File transport for errors
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: fileFormat,
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: fileFormat,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
});

export default logger;
