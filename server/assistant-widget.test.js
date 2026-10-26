import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAutoFocusAssistantInput } from '../src/lib/assistantUi.js';

test('opening or reopening the assistant does not programmatically focus mobile input', () => {
  assert.equal(shouldAutoFocusAssistantInput(true, true), false);
  // Reopening follows the same open-state policy; focus still requires a tap on the textarea.
  assert.equal(shouldAutoFocusAssistantInput(true, true), false);
});

test('closing the assistant never requests input focus', () => {
  assert.equal(shouldAutoFocusAssistantInput(false, false), false);
  assert.equal(shouldAutoFocusAssistantInput(false, true), false);
});

test('desktop keeps the existing input autofocus behavior when opening', () => {
  assert.equal(shouldAutoFocusAssistantInput(true, false), true);
});
