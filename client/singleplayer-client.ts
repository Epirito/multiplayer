import { Game } from "./mod.ts"
import { Player } from "./player.ts"
import { Client } from "./types.ts"

export class SingleplayerClient<T, K extends Game<T, K>> implements Client<T, K> {
    private socket!: WebSocket
    private playerObj?: Player<T>
    private game!: K
    constructor(getGame: (nPlayers: number)=>K, private render: (state: K)=>void, private onStart: ()=>void, fps=60,) {
        this.game = getGame(1)
            this.onStart()
            setInterval(() => {
              this.playerInput(null)
            }, 1000 / fps)
    }
    playerInput(move: T | null) {
        if (move!==null) { 
            this.game.makeMove(this.player, move)
        }
        this.game.tick()
        this.render(this.game)
    }
    get player() {
        return 0
    }
    get renderable() {
      return this.game
    }
  }