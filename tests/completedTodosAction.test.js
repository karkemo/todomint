const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveCompletedTodoAction } = require('../services/completed_todos_action');

test('keeps todos visible when action is keep', () => {
  assert.equal(resolveCompletedTodoAction('keep', true), 'update');
});

test('deletes todos immediately when action is delete', () => {
  assert.equal(resolveCompletedTodoAction('delete', true), 'delete');
});

test('marks todos completed when action is move', () => {
  assert.equal(resolveCompletedTodoAction('move', true), 'update');
});

test('does not change behavior for incomplete todos', () => {
  assert.equal(resolveCompletedTodoAction('delete', false), 'noop');
});
