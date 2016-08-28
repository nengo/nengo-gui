import * as test from "tape";

import Config from "../config";

test("Config defaults", t => {
    const config: any = new Config();

    t.equal(config.transparent_nets, false);
    t.equal(config.aspect_resize, false);
    t.equal(config.zoom_fonts, false);
    t.equal(config.font_size, 100);
    t.equal(config.scriptdir, ".");
    t.equal(config.hide_editor, false);
    t.equal(config.editor_width, 580);
    t.equal(config.editor_font_size, 12);
    t.equal(config.auto_update, true);
    t.equal(config.console_height, 100);
    t.end();
});

test("Config handles bool", t => {
    const config: any = new Config();

    config.hide_editor = "sorta true";
    t.equal(config.hide_editor, false);
    config.hide_editor =  true;
    t.equal(config.hide_editor, true);
    config.hide_editor = "true";
    t.equal(config.hide_editor, true);
    t.end();
});

test("Config handles number", t => {
    const config: any = new Config();

    config.editor_width = "10";
    t.equal(config.editor_width, 10);
    config.editor_width = 100;
    t.equal(config.editor_width, 100);
    config.editor_width = "string";
    t.assert(isNaN(config.editor_width));
    t.end();
});
