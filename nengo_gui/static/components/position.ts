export class Position {
    left: number;
    top: number;
    width: number | null;
    height: number | null;

    constructor(
        left: number = 0,
        top: number = 0,
        width: number = null,
        height: number = null
    ) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }
}
