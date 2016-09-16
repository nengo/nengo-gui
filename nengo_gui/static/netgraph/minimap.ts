import NetGraphConnection from "./connection";
import NetGraphItem from "./item";

export class Minimap {
    conns: {[uid: string]: NetGraphConnection} = {};
    div;
    display;
    height;
    max_x: number = 0;
    min_x: number = 0;
    max_y: number = 0;
    min_y: number = 0;
    objects: {[uid: string]: NetGraphItem} = {};
    scale: number = 0.1;
    width;

}
