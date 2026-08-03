function resolveCompletedTodoAction(action, isCompleted) {
  if (!isCompleted) return 'noop';

  if (action === 'delete') return 'delete';
  return 'update';
}

module.exports = {
  resolveCompletedTodoAction
};
