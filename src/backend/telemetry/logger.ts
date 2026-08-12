import winston from 'winston';

// Middleware to scrub Personal Identifiable Information (PII) before logging
const scrubPII = winston.format((info) => {
  if (typeof info.message === 'string') {
    let msg = info.message;
    // Basic scrubbing rules (e.g., masking emails, standard Discord IDs could be added here)
    msg = msg.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
    // Discord ID masking pattern (Optional, typically 17-19 digits)
    msg = msg.replace(/\b\d{17,19}\b/g, '[REDACTED_ID]');
    info.message = msg;
  }
  return info;
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    scrubPII(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    })
  ]
});
