var splode = require('../splode');

var exit = process.exit;
var exits = 0;
var mochaHandler;

process.exit = function () {
  exits++;
};

var splodeListener;
var otherListeners = [];
var blackHoleLog = {
  error: function () {},
  warn: function () {},
  IS_BLACK_HOLE: true
};
var AppendLog = function () {
  var log = this;
  log.ERR = [];
  log.error = function (message) {
    log.ERR.push(message);
  },
  log.WRN = [];
  log.warn = function (message) {
    log.WRN.push(message);
  }
};

function listenUniquely() {
  splode._callbacks.pop();
  while (listener = process.listeners('uncaughtException').pop()) {
      process.removeListener('uncaughtException', listener);
      if (listener.name == 'SPLODE_LISTENER') {
        splodeListener = listener;
      } else {
        otherListeners.push(listener);
      }
  }
  if (splodeListener) {
    process.addListener('uncaughtException', splodeListener);
  }
}

describe('splode', function () {

  describe('.setLog', function () {

    it('should be a function', function () {
      is(typeof splode.setLog, 'function');
    });

    it('should set a log', function () {
      splode.setLog(new AppendLog());
      is(splode.log.ERR.length, 0);
    });

    it('should require .error and .warn', function () {
      listenUniquely();
      var log = splode.log;
      splode.setLog(blackHoleLog);
      splode.listen(function (err) {
        if (/Splode log/.test(err.message)) {
          splode.recover();
        }
      });
      var doNothing = function() {};
      splode.setLog({});
      splode.setLog({warn: doNothing});
      splode.setLog({error: doNothing});
      splode.setLog({error: 1, warn: doNothing});
      splode.setLog({error: doNothing, warn: 1});
      is(splode.log.IS_BLACK_HOLE, true);
      splode.setLog(log);
    });

  });

  describe('.listen', function () {

    it('should be a function', function () {
      is(typeof splode.listen, 'function');
    });

    it('should listen for errors', function (done) {
      listenUniquely();
      splode.exitDelay = 5;
      exits = 0;
      splode.listen(function (err) {
        setTimeout(function () {
          is.error(err);
          is(err.message, 'error');
          is.in(err.stack, 'splode');
          is(exits, 1);
          done();
        }, 10);
      });
      process.emit('uncaughtException', new Error('error'));
    });

    it('should prevent circular errors', function () {
      listenUniquely();
      splode.listen(function (err) {
        throw 'circular';
      });
      process.emit('uncaughtException', new Error());
    });

  });

  describe('.recover', function () {

    it('should be a function', function () {
      is(typeof splode.recover, 'function');
    });

    it('should recover from an error', function (done) {
      listenUniquely();
      exits = 0;
      splode.listen(function (err) {
        if (/BBQ/.test(err.message)) {
          splode.recover();
        }
        setImmediate(function () {
          is(exits, 0);
          done();
        });
      });
      process.emit('uncaughtException', new Error('OMGWTFBBQ'));
    });

  });

});
