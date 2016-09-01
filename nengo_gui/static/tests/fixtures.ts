import * as fs from "fs";
import * as jsdom from "jsdom";
import * as path from "path";

const page = fs.readFileSync(path.join(
    __dirname, "..", "..", "templates", "page.html"
), "utf-8");

export const document = jsdom.jsdom(page);
export const window = document.defaultView;

// Inject the window globally so it's picked up by dependencies
global["window"] = window; // tslint:disable-line
