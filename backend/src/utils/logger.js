const { createLogger, format, transports } = require('winston');
const path = require('path');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const extras = Object.keys(meta).length 
            ? ' ' + JSON.stringify(meta) 
            : '';
          return `${timestamp} [${level}] ${message}${extras}`;
        })
      )
    }),
    new transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error'
    }),
    new transports.File({
      filename: path.join('logs', 'combined.log')
    }),
  ]
});

module.exports = logger;