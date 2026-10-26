import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [layout, assistant, styles] = await Promise.all([
  readFile(new URL('../src/components/layout/AppLayout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/assistant/AssistantWidget.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/index.css', import.meta.url), 'utf8'),
]);

test('portal shell gives its independent scroll area a bounded dynamic viewport height', () => {
  assert.match(layout, /management-app h-\[100dvh\].*md:h-screen/);
  assert.match(layout, /min-h-0 flex-1 flex overflow-hidden/);
  assert.match(layout, /management-scroll-area h-full min-h-0 flex-1[^\"]*overflow-y-auto/);
  assert.match(layout, /management-topbar[^\"]*sticky top-0/);
  assert.doesNotMatch(layout, /management-scroll-area h-screen/);
});

test('member bottom navigation reserves safe-area height and has touch-sized controls', () => {
  assert.match(layout, /member-mobile-bottom-nav md:hidden fixed bottom-0/);
  assert.match(styles, /--member-mobile-nav-clearance: calc\(3\.5rem \+ env\(safe-area-inset-bottom/);
  assert.match(styles, /\.management-app \.member-mobile-bottom-nav \{[^}]*height:var\(--member-mobile-nav-clearance\)/);
  assert.match(styles, /member-mobile-bottom-nav > button \{ min-width:48px; min-height:44px/);
});

test('member Ask SAREX launcher and panel clear the navigation and visual viewport', () => {
  assert.match(assistant, /data-member-portal=\{isMemberPortal \? 'true' : undefined\}/);
  assert.match(assistant, /visualViewport\.addEventListener\('resize'/);
  assert.match(assistant, /visualViewport\.addEventListener\('scroll'/);
  assert.match(assistant, /--sarex-ai-viewport-height/);
  assert.match(styles, /\.sarex-ai-widget\[data-member-portal="true"\] \{ bottom:calc\(var\(--member-mobile-nav-clearance/);
  assert.match(styles, /\.sarex-ai-panel \{ max-height:calc\(var\(--sarex-ai-viewport-height/);
  assert.match(assistant, /overflow-y-auto overscroll-contain/);
  assert.match(assistant, /form onSubmit=\{submit\} className="shrink-0/);
  assert.match(assistant, /sm:h-\[min\(75vh,760px\)\].*sm:w-\[420px\]/);
});
