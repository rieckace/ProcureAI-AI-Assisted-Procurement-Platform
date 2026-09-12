// Minimal test framework using Node.js built-in test runner
// To run: node --test src/middleware/__tests__/auth.test.js

const test = require('node:test');
const assert = require('node:assert');

module.exports = {
  describe: (name, fn) => {
    // Group tests under a named context
    fn();
  },
  it: (name, fn) => {
    // Use Node's test runner (supports async test fns)
    test(name, async () => {
      // Run the beforeEach hook before the test body
      if (globalThis.__beforeEachFn) globalThis.__beforeEachFn();
      await fn();
    });
  },
  expect: (actual) => {
    return {
      toBe: (expected) => assert.strictEqual(actual, expected),
      toEqual: (expected) => assert.deepStrictEqual(actual, expected),
      toBeDefined: () => assert.notStrictEqual(actual, undefined),
      toContain: (expected) => assert.ok(actual.includes(expected)),
      not: {
        toBe: (expected) => assert.notStrictEqual(actual, expected),
      },
    };
  },
  beforeEach: (fn) => {
    // Run before each test
    globalThis.__beforeEachFn = fn;
  },
};
