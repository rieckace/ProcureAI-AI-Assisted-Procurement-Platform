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
    // Use Node's test runner
    test(name, fn);
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
    // Run before each test — we'll handle this in the test files
    // This is a simplified version
    const origTest = test;
    const originalTasks = [];
    const origFn = globalThis.__beforeEachFn;
    globalThis.__beforeEachFn = fn;
  },
};
