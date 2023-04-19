import { Game } from "./mod.ts";

interface TicTacToeState {
    board: string[][];
    t: number
  }
  
export class TicTacToe implements Game<number, TicTacToe> {
    state: TicTacToeState = {
      board: [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ],
      t: 0
    };
    currentPlayer() {
      return this.state.t % 2;
    }
    makeMove(player: number, action: number) {
      const row = Math.floor(action / 3);
      const col = action % 3;
      this.state.board[row][col] = player === 0 ? "X" : "O";
    }
    tick() {
      this.state.t += 1
    }
    copy() {
      const copy = new TicTacToe();
      copy.state = structuredClone(this.state);
      return copy;
    }
    serialize(): unknown {
      return this.state;
    }
    get t() {
      return this.state.t;
    }
  }
export function deserialize(state: unknown) {
    const game = new TicTacToe();
    game.state = state as TicTacToeState;
    return game;
}
  
  
  
  