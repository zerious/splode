// There should only be one Splode per process.
if (process.splode) {
  module.exports = process.splode;
  return;
}

var splode = process.splode = exports;

/**
 * Expose the splode version.
 */
splode.version = require('./package.json').version;

/**
 * Aggregate callbacks here.
 */
splode._callbacks = [];

/**
 * Count the number of exceptions we've caught.
 */
splode._exceptionCount = 0;

/**
 * Delay for a second before making the process exit (so it can log errors).
 */
splode.exitDelay = 1e3;

/**
 * Allow users to listen for uncaught exceptions.
 */
splode.listen = function (callback) {
  splode._callbacks.push(callback);
};

/**
* Tell Splode not to exit the process.
*/
splode.recover = function () {
  splode._isRecoverable = true;
};

/**
 * Log to the console by default.
 */
splode.log = console;

/**
 * Set a custom log.
 */
splode.setLog = function (log) {
  if (typeof log.error != 'function') {
    process.emit('uncaughtException', new Error("Splode log must have an error method."));
    return;
  }
  if (typeof log.warn != 'function') {
    process.emit('uncaughtException', new Error("Splode log must have a warn method."));
    return;
  }
  splode.log = log;
};

/**
 * Uniquely listen for uncaught exceptions.
 */
process.removeAllListeners('uncaughtException');
process.on('uncaughtException', function SPLODE_LISTENER(error) {
  ++splode._exceptionCount;
  splode._isRecoverable = false;
  try {
    splode._callbacks.forEach(function (callback) {
      callback(error);
    });
  }
  catch (e) {
    splode.log.error('Splode detected an error in an error handler.');
    splode._isRecoverable = true;
  }
  if (splode._isRecoverable) {
    splode.log.warn(error);
  }
  else {
    if (!error) {
      try {
        throw new Error('Uncaught exception.');
      }
      catch (e) {
        error = e;
      }
    }
    splode.log.error('[Splode] ' + (error.stack || error));

    // Allow health checks to fail while we're waiting to exit.
    process._isShuttingDown = true;

    // Remove listeners to prevent the process from failing to exit.
    process.removeAllListeners('beforeExit');
    process.removeAllListeners('exit');
    process.removeAllListeners('uncaughtException');

    // Delay exiting, allowing the process to shut down gracefully.
    setTimeout(process.exit, splode.exitDelay);
  }
  delete splode._isRecoverable;
});
