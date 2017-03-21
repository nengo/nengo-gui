/**
 * Test management for hotkeys.
 */

import * as test from "tape";

import * as fixtures from "./fixtures";

import { HotkeyManager } from "../hotkeys";

test("Hotkey", assert => {
    fixtures.teardown(assert);
});
