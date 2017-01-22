import { NetGraphConnection } from "./connection";
import { NetGraphItem } from "./items/item";

export class Minimap {
    conns: {[uid: string]: NetGraphConnection} = {};
    div;
    display;
    height;
    maxX: number = 0;
    minX: number = 0;
    maxY: number = 0;
    minY: number = 0;
    objects: {[uid: string]: NetGraphItem} = {};
    scale: number = 0.1;
    width;

}
