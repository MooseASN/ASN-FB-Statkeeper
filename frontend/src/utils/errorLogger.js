/**
 * Error Logging Utility
 * Sends frontend errors to backend for tracking
 */

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Log an error to the backend
 * @param {Object} errorData - Error information
 * @param {string} errorData.message - Error message
 * @param {string} errorData.stack_trace - Stack trace (optional)
 * @param {string} errorData.component - Component name where error occurred (optional)
 * @param {string} errorData.error_type - Type: 'frontend', 'api', 'integration'
 * @param {Object} errorData.additional_info - Any extra context (optional)
 */
export async function logError(errorData) {
  try {
    const payload = {
      error_type: errorData.error_type || 'frontend',
      message: errorData.message || 'Unknown error',
      stack_trace: errorData.stack_trace || null,
      url: window.location.href,
      user_agent: navigator.userAgent,
      component: errorData.component || null,
      additional_info: {
        ...errorData.additional_info,
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    // Fire and forget - don't await to avoid blocking
    fetch(`${API}/errors/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    }).catch(() => {
      // Silently fail - we don't want error logging to cause more errors
      console.warn('Failed to log error to backend');
    });

  } catch (e) {
    // Silently fail
    console.warn('Error in error logger:', e);
  }
}

/**
 * Log an API error
 * @param {Error} error - The error object
 * @param {string} endpoint - The API endpoint that failed
 * @param {Object} requestData - Request data (optional, will be sanitized)
 */
export function logApiError(error, endpoint, requestData = null) {
  // Sanitize request data - remove sensitive fields
  let sanitizedData = null;
  if (requestData) {
    const { password, token, ...safe } = requestData;
    sanitizedData = safe;
  }

  logError({
    error_type: 'api',
    message: `API Error: ${endpoint} - ${error.message}`,
    stack_trace: error.stack,
    additional_info: {
      endpoint,
      status: error.response?.status,
      response_data: error.response?.data,
      request_data: sanitizedData
    }
  });
}

/**
 * Log a React component error
 * @param {Error} error - The error object
 * @param {Object} errorInfo - React error info with componentStack
 * @param {string} componentName - Name of the component
 */
export function logComponentError(error, errorInfo, componentName) {
  logError({
    error_type: 'frontend',
    message: `Component Error: ${componentName} - ${error.message}`,
    stack_trace: error.stack,
    component: componentName,
    additional_info: {
      componentStack: errorInfo?.componentStack
    }
  });
}

/**
 * Set up global error handlers
 */
export function setupGlobalErrorHandlers() {
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError({
      error_type: 'frontend',
      message: `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`,
      stack_trace: event.reason?.stack,
      additional_info: {
        type: 'unhandledrejection'
      }
    });
  });

  // Catch global errors
  window.addEventListener('error', (event) => {
    // Ignore script errors from third-party scripts
    if (event.message === 'Script error.' && !event.filename) {
      return;
    }

    logError({
      error_type: 'frontend',
      message: `Global Error: ${event.message}`,
      stack_trace: event.error?.stack,
      additional_info: {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  });
}

export default { logError, logApiError, logComponentError, setupGlobalErrorHandlers };
