export class Player<T> {
    actionQueue: { action: T; t: number }[] = [];
    furthestUpdateT = -1;
    constructor(public id: number) {}
}