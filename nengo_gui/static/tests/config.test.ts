import * as test from "tape";

import { config } from "../config";

import * as fixtures from "./fixtures";

test("config defaults", assert => {
    config.restoreDefaults();
    assert.equal(config.transparentNets, false);
    assert.equal(config.aspectResize, false);
    assert.equal(config.zoomFonts, false);
    assert.equal(config.fontPercent, 100);
    assert.equal(config.scriptdir, ".");
    assert.equal(config.hideEditor, false);
    assert.equal(config.editorWidth, 580);
    assert.equal(config.editorFontSize, 12);
    assert.equal(config.autoUpdate, true);
    assert.equal(config.consoleHeight, 100);
    fixtures.teardown(assert);
});
