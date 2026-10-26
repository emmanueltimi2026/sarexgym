import test from 'node:test';
import assert from 'node:assert/strict';
import { getAssistantWidgetBottom, shouldAutoFocusAssistantInput } from '../src/lib/assistantUi.js';

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

test('member portal launcher reserves bottom navigation and safe-area clearance', () => {
  assert.equal(getAssistantWidgetBottom(true, 0), 'calc(0px + var(--member-mobile-nav-clearance, 3.5rem) + 0.75rem)');
  assert.equal(getAssistantWidgetBottom(true, 18), 'calc(18px + var(--member-mobile-nav-clearance, 3.5rem) + 0.75rem)');
});

test('mobile keyboard position takes precedence over bottom-navigation clearance', () => {
  assert.equal(getAssistantWidgetBottom(true, 260), 'calc(260px + 0.75rem)');
});

test('public chatbot keeps the device safe-area inset when no member navigation is present', () => {
  assert.equal(getAssistantWidgetBottom(false, 0), 'calc(0px + 0.75rem + env(safe-area-inset-bottom, 0px))');
});
