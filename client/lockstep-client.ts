import { Player } from "./player.ts"
import { Game, Model } from "./types.ts"

export class LockstepClient<T, K extends Game<T, K>> {
    private socket!: WebSocket
    private playerObj?: Player<T>
    private model: Model<T, K> | undefined
    player?: number
    constructor(getModel: (nPlayers: number)=>Model<T, K>, private render: (state: K)=>void, private onStart: ()=>void, serverURL: string, fps=60) {
      this.socket = new WebSocket(serverURL)
      this.socket.onmessage = (e: MessageEvent) => {
        const parsed = JSON.parse(e.data) as {type: string, msg: any}
        switch(parsed.type) {
          case "start": {
            this.model = getModel(parsed.msg.nPlayers)
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
    get renderable() {
      return this.model!.renderable
    }
    playerInput(move: T | null) {
      const t = this.model!.furthestT+1
      this.sendJSON({type: "moved", msg: {move, t}})
      this.model!.receiveAction(this.player!, move, t)
      this.render(this.model!.renderable)
    }
  }