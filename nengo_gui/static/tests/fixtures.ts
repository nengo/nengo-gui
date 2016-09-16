import * as fs from "fs";
import * as jsdom from "jsdom";
import * as path from "path";
import { Test } from "tape";

abstract class Fixture {
    constructor(assert: Test) {} // tslint:disable-line
    teardown(assert: Test): void {} // tslint:disable-line
}

export function teardown(assert: Test, ...fixtures: Fixture[]) {
    fixtures.forEach(fixture => {
        fixture.teardown(assert);
    });
    // If you don't want the assert.end() behavior, call teardowns manually.
    assert.end();
}

// Have to do this outside of the class so that the global will be
// set for jQuery, d3, etc

const page = fs.readFileSync(path.join(
    __dirname, "..", "..", "templates", "page.html"
), "utf-8");
global["document"] = jsdom.jsdom(page); // tslint:disable-line
global["window"] = global["document"].defaultView; // tslint:disable-line

export class Document extends Fixture {

    document: jsdom.DocumentWithParentWindow;
    window: Window;

    constructor(assert: Test) {
        super(assert);
        this.document = jsdom.jsdom(page);
        this.window = this.document.defaultView;

        // Inject the window globally so it's picked up by dependencies
        global["document"] = this.document; // tslint:disable-line
        global["window"] = this.window; // tslint:disable-line
    }
}
