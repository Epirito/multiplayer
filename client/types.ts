import { Player } from "./player.ts";

export interface Game<T, K extends Game<T, K>> {
    tick(): void
    makeMove(player: number, action: T): void;
    spawn?(player: number): void;
    despawn?(player: number): void;
    copy(): K;
    serialize?(): unknown;
    get t(): number
}
export interface Model<T, K extends Game<T, K>> {
    players: Map<number, Player<T>>;
    receiveAction(playerId: number, action: T | null, t: number, _?: boolean): void;
    receiveMetaAction(type: string, data: unknown): void;
    get furthestT(): number
    get renderable(): K
}
export interface Client<T, K extends Game<T, K>> {
    playerInput(move: T | null): void
    get renderable(): K
    get player(): number | undefined
}