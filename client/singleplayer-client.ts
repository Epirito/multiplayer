import { Game } from "./mod.ts"
import { Player } from "./player.ts"
import { Client } from "./types.ts"

export class SingleplayerClient<T, K extends Game<T, K>> implements Client<T, K> {
    private socket!: WebSocket
    private playerObj?: Player<T>
    private game!: K
    constructor(getGame: (nPlayers: number)=>K, private render: (state: K)=>void, private onStart: ()=>void, frameProvider = (f: ()=>void)=>{setInterval(f, 1000/60)}) {
        this.game = getGame(1)
            setTimeout(()=>{
                this.onStart()
                frameProvider(()=>{
                    this.playerInput(null)
                    this.render(this.game)
                })
            }, 0)
    }
    playerInput(move: T | null) {
        if (move!==null) { 
            this.game.makeMove(this.player, move)
        }
        this.game.tick()
    }
    get player() {
        return 0
    }
    get renderable() {
      return this.game
    }
  }