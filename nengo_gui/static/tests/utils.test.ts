import * as test from "tape";

import * as fixtures from "./fixtures";
import * as utils from "../utils";

// throttle, delay, and debounce modified from underscore.js, MIT licensed.

test("delay", assert => {
    let delayed = false;
    utils.delay(() => {
        delayed = true;
    }, 100);
    setTimeout(() => {
        assert.notOk(delayed, "didn't delay the function quite yet");
    }, 50);
    setTimeout(() => {
        assert.ok(delayed, "delayed the function");
        fixtures.teardown(assert);
    }, 150);
});

test("throttle", assert => {
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

// test('throttle arguments', function(assert) {
//     assert.expect(2);
//     var done = assert.async();
//     var value = 0;
//     var update = function(val){ value = val; };
//     var throttledUpdate = _.throttle(update, 32);
//     throttledUpdate(1); throttledUpdate(2);
//     _.delay(function(){ throttledUpdate(3); }, 64);
//     assert.equal(value, 1, 'updated to latest value');
//     _.delay(function(){ assert.equal(value, 3, 'updated to latest value'); done(); }, 96);
// });

// test('throttle once', function(assert) {
//     assert.expect(2);
//     var done = assert.async();
//     var counter = 0;
//     var incr = function(){ return ++counter; };
//     var throttledIncr = _.throttle(incr, 32);
//     var result = throttledIncr();
//     _.delay(function(){
//         assert.equal(result, 1, 'throttled functions return their value');
//         assert.equal(counter, 1, 'incr was called once'); done();
//     }, 64);
// });

// test('throttle twice', function(assert) {
//     assert.expect(1);
//     var done = assert.async();
//     var counter = 0;
//     var incr = function(){ counter++; };
//     var throttledIncr = _.throttle(incr, 32);
//     throttledIncr(); throttledIncr();
//     _.delay(function(){ assert.equal(counter, 2, 'incr was called twice'); done(); }, 64);
// });

// test('more throttling', function(assert) {
//     assert.expect(3);
//     var done = assert.async();
//     var counter = 0;
//     var incr = function(){ counter++; };
//     var throttledIncr = _.throttle(incr, 30);
//     throttledIncr(); throttledIncr();
//     assert.equal(counter, 1);
//     _.delay(function(){
//         assert.equal(counter, 2);
//         throttledIncr();
//         assert.equal(counter, 3);
//         done();
//     }, 85);
// });

// test('throttle repeatedly with results', function(assert) {
//     assert.expect(6);
//     var done = assert.async();
//     var counter = 0;
//     var incr = function(){ return ++counter; };
//     var throttledIncr = _.throttle(incr, 100);
//     var results = [];
//     var saveResult = function() { results.push(throttledIncr()); };
//     saveResult(); saveResult();
//     _.delay(saveResult, 50);
//     _.delay(saveResult, 150);
//     _.delay(saveResult, 160);
//     _.delay(saveResult, 230);
//     _.delay(function() {
//         assert.equal(results[0], 1, 'incr was called once');
//         assert.equal(results[1], 1, 'incr was throttled');
//         assert.equal(results[2], 1, 'incr was throttled');
//         assert.equal(results[3], 2, 'incr was called twice');
//         assert.equal(results[4], 2, 'incr was throttled');
//         assert.equal(results[5], 3, 'incr was called trailing');
//         done();
//     }, 300);
// });

// test('throttle triggers trailing call when invoked repeatedly', function(assert) {
//     assert.expect(2);
//     var done = assert.async();
//     var counter = 0;
//     var limit = 48;
//     var incr = function(){ counter++; };
//     var throttledIncr = _.throttle(incr, 32);

//     var stamp = new Date;
//     while (new Date - stamp < limit) {
//         throttledIncr();
//     }
//     var lastCount = counter;
//     assert.ok(counter > 1);

//     _.delay(function() {
//         assert.ok(counter > lastCount);
//         done();
//     }, 96);
// });

// test('throttle does not trigger leading call when leading is set to false', function(assert) {
//     assert.expect(2);
//     var done = assert.async();
//     var counter = 0;
//     var incr = function(){ counter++; };
//     var throttledIncr = _.throttle(incr, 60, {leading: false});

//     throttledIncr(); throttledIncr();
//     assert.equal(counter, 0);

//     _.delay(function() {
//         assert.equal(counter, 1);
//         done();
//     }, 96);
// });

// test('more throttle does not trigger leading call when leading is set to false', function(assert) {
//     assert.expect(3);
//     var done = assert.async();
//     var counter = 0;
//     var incr = function(){ counter++; };
//     var throttledIncr = _.throttle(incr, 100, {leading: false});

//     throttledIncr();
//     _.delay(throttledIncr, 50);
//     _.delay(throttledIncr, 60);
//     _.delay(throttledIncr, 200);
//     assert.equal(counter, 0);

//     _.delay(function() {
//         assert.equal(counter, 1);
//     }, 250);

//     _.delay(function() {
//         assert.equal(counter, 2);
//         done();
//     }, 350);
// });

// test('one more throttle with leading: false test', function(assert) {
//     assert.expect(2);
//     var done = assert.async();
//     var counter = 0;
//     var incr = function(){ counter++; };
//     var throttledIncr = _.throttle(incr, 100, {leading: false});

//     var time = new Date;
//     while (new Date - time < 350) throttledIncr();
//     assert.ok(counter <= 3);

//     _.delay(function() {
//         assert.ok(counter <= 4);
//         done();
//     }, 200);
// });

// test('throttle does not trigger trailing call when trailing is set to false', function(assert) {
//     assert.expect(4);
//     var done = assert.async();
//     var counter = 0;
//     var incr = function(){ counter++; };
//     var throttledIncr = _.throttle(incr, 60, {trailing: false});

//     throttledIncr(); throttledIncr(); throttledIncr();
//     assert.equal(counter, 1);

//     _.delay(function() {
//         assert.equal(counter, 1);

//         throttledIncr(); throttledIncr();
//         assert.equal(counter, 2);

//         _.delay(function() {
//             assert.equal(counter, 2);
//             done();
//         }, 96);
//     }, 96);
// });

// test('throttle continues to function after system time is set backwards', function(assert) {
//     assert.expect(2);
//     var done = assert.async();
//     var counter = 0;
//     var incr = function(){ counter++; };
//     var throttledIncr = _.throttle(incr, 100);
//     var origNowFunc = _.now;

//     throttledIncr();
//     assert.equal(counter, 1);
//     _.now = function() {
//         return new Date(2013, 0, 1, 1, 1, 1);
//     };

//     _.delay(function() {
//         throttledIncr();
//         assert.equal(counter, 2);
//         done();
//         _.now = origNowFunc;
//     }, 200);
// });

// test('throttle re-entrant', function(assert) {
//     assert.expect(2);
//     var done = assert.async();
//     var sequence = [
//         ['b1', 'b2'],
//         ['c1', 'c2']
//     ];
//     var value = '';
//     var throttledAppend;
//     var append = function(arg){
//         value += this + arg;
//         var args = sequence.pop();
//         if (args) {
//             throttledAppend.call(args[0], args[1]);
//         }
//     };
//     throttledAppend = _.throttle(append, 32);
//     throttledAppend.call('a1', 'a2');
//     assert.equal(value, 'a1a2');
//     _.delay(function(){
//         assert.equal(value, 'a1a2c1c2b1b2', 'append was throttled successfully');
//         done();
//     }, 100);
// });

// test('throttle cancel', function(assert) {
//     var done = assert.async();
//     var counter = 0;
//     var incr = function(){ counter++; };
//     var throttledIncr = _.throttle(incr, 32);
//     throttledIncr();
//     throttledIncr.cancel();
//     throttledIncr();
//     throttledIncr();

//     assert.equal(counter, 2, 'incr was called immediately');
//     _.delay(function(){ assert.equal(counter, 3, 'incr was throttled'); done(); }, 64);
// });

// test('throttle cancel with leading: false', function(assert) {
//     var done = assert.async();
//     var counter = 0;
//     var incr = function(){ counter++; };
//     var throttledIncr = _.throttle(incr, 32, {leading: false});
//     throttledIncr();
//     throttledIncr.cancel();

//     assert.equal(counter, 0, 'incr was throttled');
//     _.delay(function(){ assert.equal(counter, 0, 'incr was throttled'); done(); }, 64);
// });

// test("utils.debounce", assert => {
// });
