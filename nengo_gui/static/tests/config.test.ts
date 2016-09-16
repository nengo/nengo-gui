import * as test from "tape";

import { config } from "../config";
import * as fixtures from "./fixtures";

test("config defaults", assert => {
    config.restore_defaults();
    assert.equal(config.transparent_nets, false);
    assert.equal(config.aspect_resize, false);
    assert.equal(config.zoom_fonts, false);
    assert.equal(config.font_size, 100);
    assert.equal(config.scriptdir, ".");
    assert.equal(config.hide_editor, false);
    assert.equal(config.editor_width, 580);
    assert.equal(config.editor_font_size, 12);
    assert.equal(config.auto_update, true);
    assert.equal(config.console_height, 100);
    fixtures.teardown(assert);
});
