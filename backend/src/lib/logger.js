/**
 * Structured logger utility for ProcureAI backend.
 *
 * Provides:
 * - Log levels (error, warn, info, debug)
 * - Request context enrichment
 * - Error object sanitization (no stack traces or full objects in production messages)
 * - Consistent format for all backend logging
 */

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.debug;

function timestamp() {
  return new Date().toISOString();
}

function sanitizeForMessage(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack?.split('\n').slice(0, 4).join('\n') }),
    };
  }
  return error;
}

const logger = {
  error(context, error, extra = {}) {
    if (CURRENT_LEVEL < LOG_LEVELS.error) return;
    const sanitized = sanitizeForMessage(error);
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: timestamp(),
        context,
        error: sanitized,
        ...extra,
      })
    );
  },

  warn(context, message, extra = {}) {
    if (CURRENT_LEVEL < LOG_LEVELS.warn) return;
    console.warn(
      JSON.stringify({
        level: 'warn',
        timestamp: timestamp(),
        context,
        message,
        ...extra,
      })
    );
  },

  info(context, message, extra = {}) {
    if (CURRENT_LEVEL < LOG_LEVELS.info) return;
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: timestamp(),
        context,
        message,
        ...extra,
      })
    );
  },

  debug(context, message, extra = {}) {
    if (CURRENT_LEVEL < LOG_LEVELS.debug) return;
    console.debug(
      JSON.stringify({
        level: 'debug',
        timestamp: timestamp(),
        context,
        message,
        ...extra,
      })
    );
  },
};

module.exports = logger;
