const fs = require('fs');
const path = require('path');

/**
 * Comprehensive error handling middleware for the Financial Dashboard API
 */
class ErrorHandler {
  constructor() {
    this.logDirectory = path.join(__dirname, '../../../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  /**
   * Main error handling middleware
   */
  handle = (error, req, res, next) => {
    // Log the error
    this.logError(error, req);

    // Determine error type and response
    const errorResponse = this.createErrorResponse(error, req);
    
    // Send response
    res.status(errorResponse.statusCode).json(errorResponse.body);
  }

  /**
   * Async route wrapper to catch Promise rejections
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Create standardized error response
   */
  createErrorResponse(error, req) {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Default error properties
    let statusCode = error.statusCode || error.status || 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    // Handle specific error types
    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
      code = 'VALIDATION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid data format';
      code = 'INVALID_FORMAT';
    } else if (error.code === 'ENOENT') {
      statusCode = 404;
      message = 'Resource not found';
      code = 'NOT_FOUND';
    } else if (error.code === 'SQLITE_CONSTRAINT') {
      statusCode = 409;
      message = 'Data constraint violation';
      code = 'CONSTRAINT_ERROR';
    } else if (error.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      message = 'File too large';
      code = 'FILE_TOO_LARGE';
    } else if (isDevelopment && error.message) {
      message = error.message;
    }

    const errorResponse = {
      statusCode,
      body: {
        success: false,
        error: {
          code,
          message,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method,
          requestId: req.id || this.generateRequestId()
        }
      }
    };

    // Add stack trace in development
    if (isDevelopment && error.stack) {
      errorResponse.body.error.stack = error.stack;
    }

    // Add validation details if available
    if (error.errors) {
      errorResponse.body.error.details = error.errors;
    }

    return errorResponse;
  }

  /**
   * Log error to file and console
   */
  logError(error, req) {
    const timestamp = new Date().toISOString();
    const requestId = req.id || this.generateRequestId();

    const logEntry = {
      timestamp,
      requestId,
      level: 'ERROR',
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      body: this.sanitizeBody(req.body),
      query: req.query,
      params: req.params
    };

    // Console log for development
    if (process.env.NODE_ENV !== 'production') {
      console.error('🚨 Error occurred:', {
        path: req.path,
        method: req.method,
        message: error.message,
        stack: error.stack
      });
    }

    // File log
    this.writeLogToFile(logEntry);
  }

  /**
   * Write log entry to file
   */
  writeLogToFile(logEntry) {
    const logFile = path.join(this.logDirectory, `error-${new Date().toISOString().split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';

    fs.appendFile(logFile, logLine, (err) => {
      if (err) {
        console.error('Failed to write error log:', err);
      }
    });
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Request logger middleware
   */
  requestLogger = (req, res, next) => {
    const start = Date.now();
    req.id = this.generateRequestId();

    // Log request
    const requestLog = {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      level: 'INFO',
      type: 'REQUEST',
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log(`📥 ${req.method} ${req.path} [${req.id}]`);
    }

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - start;
      const responseLog = {
        ...requestLog,
        type: 'RESPONSE',
        statusCode: res.statusCode,
        duration: `${duration}ms`
      };

      if (process.env.NODE_ENV !== 'production') {
        const statusIcon = res.statusCode >= 400 ? '❌' : '✅';
        console.log(`📤 ${statusIcon} ${req.method} ${req.path} ${res.statusCode} (${duration}ms) [${req.id}]`);
      }
    });

    next();
  }

  /**
   * Rate limiting error
   */
  rateLimitError = (req, res) => {
    const error = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        timestamp: new Date().toISOString(),
        path: req.path,
        retryAfter: '60 seconds'
      }
    };

    res.status(429).json(error);
  }

  /**
   * 404 handler
   */
  notFoundHandler = (req, res) => {
    const error = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
        path: req.path
      }
    };

    res.status(404).json(error);
  }
}

module.exports = new ErrorHandler();