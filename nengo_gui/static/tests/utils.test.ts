import * as test from "tape";

import * as fixtures from "./fixtures";

import * as utils from "../utils";

// throttle, delay, and debounce modified from underscore.js, MIT licensed.

test("utils.delay", assert => {
    assert.plan(2);
    let delayed = false;
    utils.delay(() => {
        delayed = true;
    }, 100);
    setTimeout(() => {
        assert.notOk(delayed, "didn't delay the function quite yet");
    }, 50);
    setTimeout(() => {
        assert.ok(delayed, "delayed the function");
    }, 150);
});

test("utils.throttle", assert => {
    let counter = 0;
    const incr = () => {
        counter++;
    };
    const throttledIncr = utils.throttle(incr, 32);
    throttledIncr();
    throttledIncr();

    assert.equal(counter, 1, "incr was called immediately");
    utils.delay(() => {
        assert.equal(counter, 2, "incr was throttled");
        fixtures.teardown(assert);
    }, 64);
});

test("utils.throttle arguments", assert => {
    let value = 0;
    const update = val => {
        value = val;
    };
    const throttledUpdate = utils.throttle(update, 32);
    throttledUpdate(1);
    throttledUpdate(2);
    utils.delay(() => {
        throttledUpdate(3);
    }, 64);
    assert.equal(value, 1, "updated to latest value");
    utils.delay(() => {
        assert.equal(value, 3, "updated to latest value");
        fixtures.teardown(assert);
    }, 96);
});

test("utils.throttle once", assert => {
    let counter = 0;
    const incr = () => {
        return ++counter;
    };
    const throttledIncr = utils.throttle(incr, 32);
    const result = throttledIncr();
    utils.delay(() => {
        assert.equal(result, 1, "throttled functions return their value");
        assert.equal(counter, 1, "incr was called once");
        fixtures.teardown(assert);
    }, 64);
});

test("utils.throttle twice", assert => {
    let counter = 0;
    const incr = () => {
        counter++;
    };
    const throttledIncr = utils.throttle(incr, 32);
    throttledIncr();
    throttledIncr();
    utils.delay(() => {
        assert.equal(counter, 2, "incr was called twice");
        fixtures.teardown(assert);
    }, 64);
});

test("utils.throttle more", assert => {
    let counter = 0;
    const incr = () => {
        counter++;
    };
    const throttledIncr = utils.throttle(incr, 30);
    throttledIncr();
    throttledIncr();
    assert.equal(counter, 1);
    utils.delay(() => {
        assert.equal(counter, 2);
        throttledIncr();
        assert.equal(counter, 3);
        fixtures.teardown(assert);
    }, 85);
});

test("utils.throttle repeatedly with results", assert => {
    let counter = 0;
    const incr = () => {
        return ++counter;
    };
    const throttledIncr = utils.throttle(incr, 100);
    const results = [];
    const saveResult = () => {
        results.push(throttledIncr());
    };
    saveResult();
    saveResult();
    utils.delay(saveResult, 50);
    utils.delay(saveResult, 150);
    utils.delay(saveResult, 160);
    utils.delay(saveResult, 230);
    utils.delay(() => {
        assert.equal(results[0], 1, "incr was called once");
        assert.equal(results[1], 1, "incr was throttled");
        assert.equal(results[2], 1, "incr was throttled");
        assert.equal(results[3], 2, "incr was called twice");
        assert.equal(results[4], 2, "incr was throttled");
        assert.equal(results[5], 3, "incr was called trailing");
        fixtures.teardown(assert);
    }, 300);
});

test("utils.throttle triggers trailing call when called repeatedly", assert => {
    let counter = 0;
    const limit = 48;
    const incr = () => {
        counter++;
    };
    const throttledIncr = utils.throttle(incr, 32);

    const stamp = utils.now();
    while (utils.now() - stamp < limit) {
        throttledIncr();
    }
    const lastCount = counter;
    assert.ok(counter > 1);

    utils.delay(() => {
        assert.ok(counter > lastCount);
        fixtures.teardown(assert);
    }, 96);
});

test("utils.throttle, leading = false", assert => {
    let counter = 0;
    const incr = () => {
        counter++;
    };
    const throttledIncr = utils.throttle(incr, 60, {leading: false});
    throttledIncr();
    throttledIncr();
    assert.equal(counter, 0);

    utils.delay(() => {
        assert.equal(counter, 1);
        fixtures.teardown(assert);
    }, 96);
});

test("utils.throttle more leading = false", assert => {
    assert.plan(3);
    let counter = 0;
    const incr = () => {
        counter++;
    };
    const throttledIncr = utils.throttle(incr, 100, {leading: false});

    throttledIncr();
    utils.delay(throttledIncr, 50);
    utils.delay(throttledIncr, 60);
    utils.delay(throttledIncr, 200);
    assert.equal(counter, 0);

    utils.delay(() => {
        assert.equal(counter, 1);
    }, 250);

    utils.delay(() => {
        assert.equal(counter, 2);
    }, 350);
});

test("utils.throttle even more leading = false", assert => {
    let counter = 0;
    const incr = () => {
        counter++;
    };
    const throttledIncr = utils.throttle(incr, 100, {leading: false});

    const time = utils.now();
    while (utils.now() - time < 350) {
        throttledIncr();
    }
    assert.ok(counter <= 3);

    utils.delay(() => {
        assert.ok(counter <= 4);
        fixtures.teardown(assert);
    }, 200);
});

test("utils.throttle trailing = false", assert => {
    let counter = 0;
    const incr = () => {
        counter++;
    };
    const throttledIncr = utils.throttle(incr, 60, {trailing: false});

    throttledIncr();
    throttledIncr();
    throttledIncr();
    assert.equal(counter, 1);

    utils.delay(() => {
        assert.equal(counter, 1);

        throttledIncr();
        throttledIncr();
        assert.equal(counter, 2);

        utils.delay(() => {
            assert.equal(counter, 2);
            fixtures.teardown(assert);
        }, 96);
    }, 96);
});

test("utils.throttle OK even if system time is set backwards", assert => {
    let counter = 0;
    const incr = () => {
        counter++;
    };
    const throttledIncr = utils.throttle(incr, 100);
    const origNowFunc = Date.now; // utils.now uses Date.now in node

    throttledIncr();
    assert.equal(counter, 1);
    Date.now = () => {
        return new Date(2013, 0, 1, 1, 1, 1).getTime();
    };

    utils.delay(() => {
        throttledIncr();
        assert.equal(counter, 2);
        Date.now = origNowFunc;
        fixtures.teardown(assert);
    }, 200);
});

test("utils.throttle re-entrant", assert => {
    const sequence = [
        ["b1", "b2"],
        ["c1", "c2"],
    ];
    let value = "";
    let throttledAppend;
    const append = function(arg) {
        value += this + arg;
        const args = sequence.pop();
        if (args) {
            throttledAppend.call(args[0], args[1]);
        }
    };
    throttledAppend = utils.throttle(append, 32);
    throttledAppend.call("a1", "a2");
    assert.equal(value, "a1a2");
    utils.delay(() => {
        assert.equal(
            value, "a1a2c1c2b1b2", "append was throttled successfully");
        fixtures.teardown(assert);
    }, 100);
});

test("utils.throttle cancel", assert => {
    let counter = 0;
    const incr = () => {
        counter++;
    };
    const throttledIncr = utils.throttle(incr, 32);
    throttledIncr();
    throttledIncr.cancel();
    throttledIncr();
    throttledIncr();

    assert.equal(counter, 2, "incr was called immediately");
    utils.delay(() => {
        assert.equal(counter, 3, "incr was throttled");
        fixtures.teardown(assert);
    }, 64);
});

test("utils.throttle cancel with leading: false", assert => {
    let counter = 0;
    const incr = () => {
        counter++;
    };
    const throttledIncr = utils.throttle(incr, 32, {leading: false});
    throttledIncr();
    throttledIncr.cancel();

    assert.equal(counter, 0, "incr was throttled");
    utils.delay(() => {
        assert.equal(counter, 0, "incr was throttled");
        fixtures.teardown(assert);
    }, 64);
});

test("utils.debounce", assert => {
    let counter = 0;
    const incr = () => {
        counter++;
    };
    const debouncedIncr = utils.debounce(incr, 32);
    debouncedIncr();
    debouncedIncr();
    utils.delay(debouncedIncr, 16);
    utils.delay(() => {
        assert.equal(counter, 1, "incr was debounced");
        fixtures.teardown(assert);
    }, 96);
});

test("utils.debounce cancel", assert => {
    let counter = 0;
    const incr = () => {
        counter++;
    };
    const debouncedIncr = utils.debounce(incr, 32);
    debouncedIncr();
    debouncedIncr.cancel();
    utils.delay(() => {
        assert.equal(counter, 0, "incr was not called");
        fixtures.teardown(assert);
    }, 96);
});

test("utils.debounce immediate = true", assert => {
    let a;
    let b;
    let c;
    let counter = 0;
    const incr = () => {
        return ++counter;
    };
    const debouncedIncr = utils.debounce(incr, 64, {immediate: true});
    a = debouncedIncr();
    b = debouncedIncr();
    assert.equal(a, 1);
    assert.equal(b, 1);
    assert.equal(counter, 1, "incr was called immediately");
    utils.delay(debouncedIncr, 16);
    utils.delay(debouncedIncr, 32);
    utils.delay(debouncedIncr, 48);
    utils.delay(() => {
        assert.equal(counter, 1, "incr was debounced");
        c = debouncedIncr();
        assert.equal(c, 2);
        assert.equal(counter, 2, "incr was called again");
        fixtures.teardown(assert);
    }, 128);
});

test("utils.debounce cancel asap", assert => {
    let a;
    let b;
    let counter = 0;
    const incr = () => {
        return ++counter;
    };
    const debouncedIncr = utils.debounce(incr, 64, {immediate: true});
    a = debouncedIncr();
    debouncedIncr.cancel();
    b = debouncedIncr();
    assert.equal(a, 1);
    assert.equal(b, 2);
    assert.equal(counter, 2, "incr was called immediately");
    utils.delay(debouncedIncr, 16);
    utils.delay(debouncedIncr, 32);
    utils.delay(debouncedIncr, 48);
    utils.delay(() => {
        assert.equal(counter, 2, "incr was debounced");
        fixtures.teardown(assert);
    }, 128);
});

test("utils.debounce asap recursively", assert => {
    let counter = 0;
    const debouncedIncr = utils.debounce(() => {
        counter++;
        if (counter < 10) {
            debouncedIncr();
        }
    }, 32, {immediate: true});
    debouncedIncr();
    assert.equal(counter, 1, "incr was called immediately");
    utils.delay(() => {
        assert.equal(counter, 1, "incr was debounced");
        fixtures.teardown(assert);
    }, 96);
});

test("utils.debounce after system time is set backwards", assert => {
    let counter = 0;
    const origNowFunc = Date.now; // utils.now uses Date.now in node
    const debouncedIncr = utils.debounce(() => {
        counter++;
    }, 100, {immediate: true});

    debouncedIncr();
    assert.equal(counter, 1, "incr was called immediately");

    Date.now = () => {
        return new Date(2013, 0, 1, 1, 1, 1).getTime();
    };

    utils.delay(() => {
        debouncedIncr();
        assert.equal(counter, 2, "incr was debounced successfully");
        Date.now = origNowFunc;
        fixtures.teardown(assert);
    }, 200);
});

test("utils.debounce re-entrant", assert => {
    const sequence = [
        ["b1", "b2"],
    ];
    let value = "";
    let debouncedAppend;
    const append = function(arg){
        value += this + arg;
        const args = sequence.pop();
        if (args) {
            debouncedAppend.call(args[0], args[1]);
        }
    };
    debouncedAppend = utils.debounce(append, 32);
    debouncedAppend.call("a1", "a2");
    assert.equal(value, "");
    utils.delay(() => {
        assert.equal(value, "a1a2b1b2", "append was debounced successfully");
        fixtures.teardown(assert);
    }, 100);
});
