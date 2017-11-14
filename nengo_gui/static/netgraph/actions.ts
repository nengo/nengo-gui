export class Action {
    apply: () => void;
    undo: () => void;

    constructor(apply: () => void, undo: () => void) {
        this.apply = apply;
        this.undo = undo;
    }
}

export class ActionStack {
    actions: Action[] = [];
    index: number = -1;

    get canUndo(): boolean {
        return this.index >= 0;
    }

    get canRedo(): boolean {
        return this.index + 1 < this.actions.length;
    }

    get lastAction(): Action {
        return this.actions[this.index];
    }

    apply(func: () => void, undo: () => void) {
        func();
        this.actions.push(new Action(func, undo));
        this.index += 1;
    }

    redo() {
        console.assert(this.canRedo);
        this.index += 1;
        this.actions[this.index].apply();
    }

    undo() {
        console.assert(this.canUndo);
        this.actions[this.index].undo();
        this.index -= 1;
    }
}
