import { Player } from "./player.ts"
import { Game, Model } from "./types.ts"

export class LockstepModel<T, K extends Game<T, K>> {
    private socket!: WebSocket
    private playerObj?: Player<T>
    player?: number
    constructor(private model: Model<T, K>, private render: (state: K)=>void, private onStart: ()=>void, serverURL: string, fps=60) {
      this.socket = new WebSocket(serverURL)
      this.socket.onopen = ()=>{setTimeout(this.ready, 3000)}
      this.socket.onmessage = (e: MessageEvent) => {
        const parsed = JSON.parse(e.data) as {type: string, msg: any}
        switch(parsed.type) {
          case "start": {
            const msg = parsed.msg as {id: number, nPlayers: number}
            this.player = msg.id
            this.onStart()
            setInterval(() => {
              this.playerInput(null)
            }, 1000 / fps)
          break;
          }
          case "moved": {
            const msg = parsed.msg as {player: number, move: T, t: number}
            if (msg.player === this.player) return;
            this.model!.receiveAction(msg.player, msg.move, msg.t, false)
          }
          break;
          case "meta": {
            const msg = parsed.msg as {type: string, player: number, t: number}
            this.model!.receiveMetaAction(msg.type, {player: msg.player, t: msg.t})
          }
        }
      }
    }
    ready = ()=> {
      this.socket.send("ready")
    }
    private sendJSON(data: any) {
      this.socket.send(JSON.stringify(data))
    }
    playerInput(move: T | null) {
      const t = this.model!.furthestT
      this.sendJSON({type: "moved", msg: {move, t}})
      this.model!.receiveAction(this.player!, move, t)
      this.render(this.model!.renderable)
    }
  }