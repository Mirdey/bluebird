"use strict";
var assert = require("assert");
var testUtils = require("./helpers/util.js");
var noop = testUtils.noop;
var isStrictModeSupported = testUtils.isStrictModeSupported;
var onUnhandledFail = testUtils.onUnhandledFail;
var onUnhandledSucceed = testUtils.onUnhandledSucceed;

function e() {
    var ret = new Error();
    ret.propagationTest = true;
    return ret;
}

function notE() {
    var rets = [{}, []];
    return rets[Math.random()*rets.length|0];
}

function cleanUp() {
    Promise.onPossiblyUnhandledRejection(null);
    Promise.onUnhandledRejectionHandled(null);
}

function setupCleanUps() {
    beforeEach(cleanUp);
    afterEach(cleanUp);
}

describe("Will report rejections that are not handled in time", function() {
    setupCleanUps();

    specify("Immediately rejected not handled at all", function testFunction() {
        var promise = Promise.defer();
        promise.reject(e());
        return onUnhandledSucceed();
    });

    specify("Eventually rejected not handled at all", function testFunction() {
        var promise = Promise.defer();
        setTimeout(function(){
            promise.reject(e());
        }, 1);
        return onUnhandledSucceed();
    });

    specify("Immediately rejected handled too late", function testFunction() {
        var promise = Promise.defer();
        promise.reject(e());
        setTimeout(function() {
            promise.promise.then(assert.fail, function(){});
        }, 1);
        return onUnhandledSucceed();
    });
    specify("Eventually rejected handled too late", function testFunction() {
        var promise = Promise.defer();
        setTimeout(function(){
            promise.reject(e());
            setTimeout(function() {
                promise.promise.then(assert.fail, function(){});
            }, 1);
        }, 1);

        return onUnhandledSucceed();
    });
});

describe("Will report rejections that are code errors", function() {
    setupCleanUps();

    specify("Immediately fulfilled handled with erroneous code", function testFunction() {
        var deferred = Promise.defer();
        var promise = deferred.promise;
        deferred.fulfill(null);
        promise.then(function(itsNull){
            itsNull.will.fail.four.sure();
        });
        return onUnhandledSucceed();
    });
    specify("Eventually fulfilled handled with erroneous code", function testFunction() {
        var deferred = Promise.defer();
        var promise = deferred.promise;
        setTimeout(function(){
            deferred.fulfill(null);
        }, 1);
        promise.then(function(itsNull){
            itsNull.will.fail.four.sure();
        });
        return onUnhandledSucceed();
    });

    specify("Already fulfilled handled with erroneous code but then recovered and failDeferred again", function testFunction() {
        var err = e();
        var promise = Promise.resolve(null);
        promise.then(function(itsNull){
            itsNull.will.fail.four.sure();
        }).then(assert.fail, function(e){
            assert.ok(e instanceof Promise.TypeError);
        }).then(function(){
            //then assert.failing again
            //this error should be reported
            throw err;
        });
        return onUnhandledSucceed(err);
    });

    specify("Immediately fulfilled handled with erroneous code but then recovered and failDeferred again", function testFunction() {
        var err = e();
        var deferred = Promise.defer();
        var promise = deferred.promise;
        deferred.fulfill(null);
        promise.then(function(itsNull){
            itsNull.will.fail.four.sure();
        }).then(assert.fail, function(e){
                assert.ok(e instanceof Promise.TypeError)
            //Handling the type error here
        }).then(function(){
            //then assert.failing again
            //this error should be reported
            throw err;
        });
        return onUnhandledSucceed(err);
    });

    specify("Eventually fulfilled handled with erroneous code but then recovered and failDeferred again", function testFunction() {
        var err = e();
        var deferred = Promise.defer();
        var promise = deferred.promise;

        promise.then(function(itsNull){
            itsNull.will.fail.four.sure();
        }).then(assert.fail, function(e){
                assert.ok(e instanceof Promise.TypeError)
            //Handling the type error here
        }).then(function(){
            //then assert.failing again
            //this error should be reported
            throw err;
        });

        setTimeout(function(){
            deferred.fulfill(null);
        }, 1);
        return onUnhandledSucceed(err);
    });

    specify("Already fulfilled handled with erroneous code but then recovered in a parallel handler and failDeferred again", function testFunction() {
        var err = e();
        var promise = Promise.resolve(null);
        promise.then(function(itsNull){
            itsNull.will.fail.four.sure();
        }).then(assert.fail, function(e){
            assert.ok(e instanceof Promise.TypeError)
        });

        promise.then(function(){
            //then assert.failing again
            //this error should be reported
            throw err;
        });
        return onUnhandledSucceed(err);
    });
});

describe("Will report rejections that are not instanceof Error", function() {
    setupCleanUps();

    specify("Immediately rejected with non instanceof Error", function testFunction() {
        var failDeferred = Promise.defer();
        failDeferred.reject(notE());
        return onUnhandledSucceed();
    });

    specify("Eventually rejected with non instanceof Error", function testFunction() {
        var failDeferred = Promise.defer();
        setTimeout(function(){
            failDeferred.reject(notE());
        }, 1);
        return onUnhandledSucceed();
    });
});

describe("Will handle hostile rejection reasons like frozen objects", function() {
    setupCleanUps();

    specify("Immediately rejected with non instanceof Error", function testFunction() {
        var failDeferred = Promise.defer();
        failDeferred.reject(Object.freeze({}));
        return onUnhandledSucceed(function(e) {
            return true;
        });
    });


    specify("Eventually rejected with non instanceof Error", function testFunction() {
        var failDeferred = Promise.defer();
        setTimeout(function(){
            failDeferred.reject(Object.freeze({}));
        }, 1);
        return onUnhandledSucceed(function(e) {
            return e instanceof Error;
        });
    });
});


describe("Will not report rejections that are handled in time", function() {
    setupCleanUps();

    specify("Already rejected handled", function testFunction() {
        var failDeferred = Promise.reject(e()).caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });

    specify("Immediately rejected handled", function testFunction() {
        var failDeferred = Promise.defer();
        failDeferred.promise.caught(noop);
        failDeferred.reject(e());
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });


    specify("Eventually rejected handled", function testFunction() {
        var failDeferred = Promise.defer();
        setTimeout(function() {
            failDeferred.reject(e());
        }, 1);
        failDeferred.promise.caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });

    specify("Already rejected handled in a deep sequence", function testFunction() {
        var failDeferred = Promise.reject(e());

        failDeferred
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){})
            .caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });

    specify("Immediately rejected handled in a deep sequence", function testFunction() {
        var failDeferred = Promise.defer();

        failDeferred.promise.then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){})
            .caught(noop);


        failDeferred.reject(e());
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });


    specify("Eventually handled in a deep sequence", function testFunction() {
        var failDeferred = Promise.defer();
        setTimeout(function() {
            failDeferred.reject(e());
        }, 1);
        failDeferred.promise.then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){})
            .caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });


    specify("Already rejected handled in a middle parallel deep sequence", function testFunction() {
        var failDeferred = Promise.reject(e());

        failDeferred
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});


        failDeferred
            .then(function(){})
            .then(function(){}, null, function(){})
            .then(assert.fail, function(){
            });

        failDeferred
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        return onUnhandledSucceed(undefined, 2);
    });


    specify("Immediately rejected handled in a middle parallel deep  sequence", function testFunction() {
        var failDeferred = Promise.defer();

        failDeferred.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failDeferred.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then(assert.fail, function(){
            });

        failDeferred.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failDeferred.reject(e());
        return onUnhandledSucceed(undefined, 2);
    });


    specify("Eventually handled in a middle parallel deep sequence", function testFunction() {
        var failDeferred = Promise.defer();

        failDeferred.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failDeferred.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then(assert.fail, function(){
            });

        failDeferred.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});


        setTimeout(function(){
            failDeferred.reject(e());
        }, 1);
        return onUnhandledSucceed(undefined, 2);
    });
});

describe("immediate assert.failures without .then", function testFunction() {
    setupCleanUps();
    var err = new Error('');
    specify("Promise.reject", function testFunction() {
        Promise.reject(err);
        return onUnhandledSucceed(function(e) {
            return e === err;
        });
    });

    specify("new Promise throw", function testFunction() {
        new Promise(function() {
            throw err;
        });
        return onUnhandledSucceed(function(e) {
            return e === err;
        });
    });

    specify("new Promise reject", function testFunction() {
        new Promise(function(_, r) {
            r(err);
        });
        return onUnhandledSucceed(function(e) {
            return e === err;
        });
    });

    specify("Promise.method", function testFunction() {
        Promise.method(function() {
            throw err;
        })();
        return onUnhandledSucceed(function(e) {
            return e === err;
        });
    });

    specify("Promise.all", function testFunction() {
        Promise.all([Promise.reject(err)]);
        return onUnhandledSucceed(function(e) {
            return e === err;
        });
    });
});


describe("immediate assert.failures with .then", function testFunction() {
    setupCleanUps();
    var err = new Error('');
    specify("Promise.reject", function testFunction() {
        Promise.reject(err).caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });

    specify("new Promise throw", function testFunction() {
        new Promise(function() {
            throw err;
        }).caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });

    specify("new Promise reject", function testFunction() {
        new Promise(function(_, r) {
            r(err);
        }).caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });

    specify("Promise.method", function testFunction() {
        Promise.method(function() {
            throw err;
        })().caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });

    specify("Promise.all", function testFunction() {
        Promise.all([Promise.reject("err")])
            .caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });


    specify("Promise.all many", function testFunction() {
        Promise.all([Promise.reject("err"), Promise.reject("err2")])
            .caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });

    specify("Promise.all many pending", function testFunction() {
        var a = new Promise(function(v, w){
            setTimeout(function(){w("err");}, 1);
        });
        var b = new Promise(function(v, w){
            setTimeout(function(){w("err2");}, 1);
        });

        Promise.all([a, b])
            .caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });

    specify("Already rejected promise for a collection", function testFunction(){
        Promise.settle(Promise.reject(err))
            .caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });
});

describe("gh-118", function() {
    setupCleanUps();
    specify("eventually rejected promise", function testFunction() {
        Promise.resolve().then(function() {
            return new Promise(function(_, reject) {
                setTimeout(function() {
                    reject(13);
                }, 1);
            });
        }).caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });

    specify("already rejected promise", function testFunction() {
        Promise.resolve().then(function() {
            return Promise.reject(13);
        }).caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });

    specify("immediately rejected promise", function testFunction() {
        Promise.resolve().then(function() {
            return new Promise(function(_, reject) {
                reject(13);
            });
        }).caught(noop);
        return onUnhandledFail(isStrictModeSupported ? testFunction : arguments.callee);
    });
});

describe("Promise.onUnhandledRejectionHandled", function() {
    specify("should be called when unhandled promise is later handled", function() {
        var unhandledPromises = [];
        var spy1 = testUtils.getSpy();
        var spy2 = testUtils.getSpy();

        Promise.onPossiblyUnhandledRejection(spy1(function(reason, promise) {
            unhandledPromises.push({
                reason: reason,
                promise: promise
            });
        }));

        Promise.onUnhandledRejectionHandled(spy2(function(promise) {
            assert.equal(unhandledPromises.length, 1);
            assert(unhandledPromises[0].promise === promise);
            assert(promise === a);
            assert(unhandledPromises[0].reason === reason);
        }));

        var reason = new Error("error");
        var a = new Promise(function(){
            throw reason;
        });
        setTimeout(function(){
            a.then(assert.fail, function(){});
        }, 1);

        return Promise.all([spy1.promise, spy2.promise]);
    });
});

if (Promise.hasLongStackTraces()) {
    describe("Gives long stack traces for non-errors", function() {
        setupCleanUps();

        specify("string", function testFunction() {
            new Promise(function(){
                throw "hello";
            });
            return onUnhandledSucceed(function(e) {
                return (e.stack.length > 100);
            });
        });

        specify("null", function testFunction() {
            new Promise(function(resolve, reject){
                Promise.reject(null);
            });
            return onUnhandledSucceed(function(e) {
                return (e.stack.length > 100);
            });
        });

        specify("boolean", function testFunction() {
            var d = Promise.defer();
            d.reject(true);
            return onUnhandledSucceed(function(e) {
                return (e.stack.length > 100);
            });
        });

        specify("undefined", function testFunction() {
            Promise.cast().then(function() {
                throw void 0;
            });
            return onUnhandledSucceed(function(e) {
                return (e.stack.length > 100);
            });
        });

        specify("number", function testFunction() {
            Promise.cast().then(function() {
                throw void 0;
            }).then(function(e){return e === void 0}, function() {
                throw 3;
            });
            return onUnhandledSucceed(function(e) {
                return (e.stack.length > 100);
            });
        });

        specify("function", function testFunction() {
            Promise.cast().then(function() {
                return Promise.reject(function(){});
            });
            return onUnhandledSucceed(function(e) {
                return (e.stack.length > 100);
            });
        });

        specify("pojo", function testFunction() {
            var OldPromise = require("./helpers/bluebird0_7_0.js");

            Promise.cast().then(function() {
                return OldPromise.rejected({});
            });
            return onUnhandledSucceed(function(e) {
                return (e.stack.length > 100);
            });
        });

        specify("Date", function testFunction() {
            var OldPromise = require("./helpers/bluebird0_7_0.js");
            Promise.cast().then(function() {
                return OldPromise.cast().then(function(){
                    throw new Date();
                });
            });
            return onUnhandledSucceed(function(e) {
                return (e.stack.length > 100);
            });
        });
    });
}

describe("global events", function() {
    var attachGlobalHandler, detachGlobalHandlers;
    if (typeof process !== "undefined" &&
        typeof process.version === "string" &&
        typeof window === "undefined") {
        attachGlobalHandler = function(name, fn) {
            process.on(name, fn);
        };
        detachGlobalHandlers = function() {
            process.removeAllListeners("unhandledRejection");
            process.removeAllListeners("rejectionHandled");
        };
    } else {
        attachGlobalHandler = function(name, fn) {
            window[("on" + name).toLowerCase()] = fn;
        };
        detachGlobalHandlers = function() {
            window.onunhandledrejection = null;
            window.onrejectionhandled = null;
        };
    }
    setupCleanUps();
    beforeEach(detachGlobalHandlers);
    afterEach(detachGlobalHandlers);
    specify("are fired", function() {
        return new Promise(function(resolve, reject) {
            var err = new Error();
            var receivedPromise;
            attachGlobalHandler("unhandledRejection", function(reason, promise) {
                assert.strictEqual(reason, err);
                receivedPromise = promise;
            });
            attachGlobalHandler("rejectionHandled", function(promise) {
                assert.strictEqual(receivedPromise, promise);
                resolve();
            });

            var promise = new Promise(function() {throw err;});
            setTimeout(function() {
                promise.then(assert.fail, function(){});
            }, 1);
        }).timeout(500);
    });

    specify("are fired with local events", function() {
        return new Promise(function(resolve, reject) {
            var expectedOrder = [1, 2, 3, 4];
            var order = [];
            var err = new Error();
            var receivedPromises = [];

            Promise.onPossiblyUnhandledRejection(function(reason, promise) {
                assert.strictEqual(reason, err);
                receivedPromises.push(promise);
                order.push(1);
            });

            Promise.onUnhandledRejectionHandled(function(promise) {
                assert.strictEqual(receivedPromises[0], promise);
                order.push(3);
            });

            attachGlobalHandler("unhandledRejection", function(reason, promise) {
                assert.strictEqual(reason, err);
                receivedPromises.push(promise);
                order.push(2);
            });

            attachGlobalHandler("rejectionHandled", function(promise) {
                assert.strictEqual(receivedPromises[1], promise);
                order.push(4);
                assert.deepEqual(expectedOrder, order);
                assert.strictEqual(receivedPromises.length, 2);
                resolve();
            });

            var promise = new Promise(function() {throw err;});
            setTimeout(function() {
                promise.then(assert.fail, function(){});
            }, 1);
        }).timeout(500);

    });
});

if (typeof document !== "undefined" && document.dispatchEvent) {
    describe("dom events", function() {
        var events = [];

        beforeEach(detachEvents);
        afterEach(detachEvents);
        function detachEvents() {
            events.forEach(function(e) {
                self.removeEventListener(e.type, e.fn, false);
            });
            events = [];
        }

        function attachEvent(type, fn) {
            events.push({type: type, fn: fn});
            self.addEventListener(type, fn, false);
        }

        specify("are fired", function() {
            return new Promise(function(resolve, reject) {
                var order = [];
                var err = new Error();
                var promise = Promise.reject(err);
                attachEvent("unhandledrejection", function(e) {
                    e.preventDefault();
                    assert.strictEqual(e.detail.promise, promise);
                    assert.strictEqual(e.detail.reason, err);
                    order.push(1);
                });
                attachEvent("unhandledrejection", function(e) {
                    assert.strictEqual(e.detail.promise, promise);
                    assert.strictEqual(e.detail.reason, err);
                    assert.strictEqual(e.defaultPrevented, true);
                    order.push(2);
                });
                attachEvent("rejectionhandled", function(e) {
                    e.preventDefault();
                    assert.strictEqual(e.detail.promise, promise);
                    assert.strictEqual(e.detail.reason, undefined);
                    order.push(3);
                });
                attachEvent("rejectionhandled", function(e) {
                    assert.strictEqual(e.detail.promise, promise);
                    assert.strictEqual(e.detail.reason, undefined);
                    assert.strictEqual(e.defaultPrevented, true);
                    order.push(4);
                    resolve();
                });

                setTimeout(function() {
                    promise.then(assert.fail, function(r) {
                        order.push(5);
                        assert.strictEqual(r, err);
                        assert.deepEqual(order, [1,2,3,4,5]);
                    });
                }, 100);
            }).timeout(500);

        })
    });
}
