/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

"use strict";

// Check that let/const can be redeclared across regular console evaluations,
// but redeclaration is still forbidden while paused in a debugger frame.

const TEST_URI = `data:text/html;charset=utf-8,<!DOCTYPE html>
<script>
function pauseInDebugger() {
  debugger;
}
</script>
`;

add_task(async function () {
  const hud = await openNewTabAndConsole(TEST_URI);
  const toolbox = gDevTools.getToolboxForTab(gBrowser.selectedTab);

  info("Check that let/const can be redeclared in regular console evaluation");
  await executeAndWaitForResultMessage(hud, "let x = 1; x;", "1");
  await executeAndWaitForResultMessage(hud, "let x = 2; x;", "2");
  await executeAndWaitForResultMessage(hud, "const c = 1; c;", "1");
  await executeAndWaitForResultMessage(hud, "const c = 2; c;", "2");

  info("Open Debugger and pause in a frame");
  await openDebugger();
  const dbg = createDebuggerContext(toolbox);

  await pauseDebugger(dbg);

  info("Opening Console");
  await toolbox.selectTool("webconsole");

  info("Check that redeclaring let/const while paused still throws");
  await executeAndWaitForErrorMessage(
    hud,
    "let x = 3;",
    "has already been declared"
  );

  await resume(dbg);
});

async function pauseDebugger(dbg) {
  const onPaused = waitForPaused(dbg);
  SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    content.wrappedJSObject.pauseInDebugger();
  });
  await onPaused;
}
