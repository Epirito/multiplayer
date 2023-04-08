import { Game } from "./types.ts";
import { Player } from "./player.ts";
import { Model } from "./types.ts";


  
export class BasicModel<T, K extends Game<T,K>> implements Model<T, K> {
    readonly players: Map<number, Player<T>>;
    playersToDelete: {player: number, t: number}[] = []
    playersToSpawn: {player: number, name: string, t: number}[] = []
    authoritative: K;
    bufferedRollback = false;
    constructor(initialState: K, nPlayers: number) {
      this.authoritative = initialState;
      this.players = new Map(Array(nPlayers)
        .fill(0)
        .map((_, i) => [i, new Player(i)]));
    }
    receiveMetaAction(type: string, data: unknown) {
      // meta actions operate on the model itself, not on the game state
      switch(type) {
        case 'delete': {
          const {player, t} = data as {player: number, t: number}
          this.players.get(player)!.furthestUpdateT = t
          this.playersToDelete.push({player, t})
        }
        break
        case 'spawn': {
          const {player, name, t} = data as {player: number, name: string, t: number}
          this.players.set(player, new Player(player))
          this.playersToSpawn.push({player, name, t})
        }
      }
    }
    receiveAction(playerId: number, action: T | null, t: number, _?: boolean) {
      const player = this.players.get(playerId)!;
      player.furthestUpdateT = t;
      if (action!==null) {
        player.actionQueue.push({ action, t });
      }
      this.updateAuthoritative(this.getTargetAuthoritativeT());
    }
    get renderable(): K {
        return this.authoritative;
    }
    get furthestT() {
      return Math.max(...( [...this.players.values()].map((p) => p.furthestUpdateT)) );
    }
    private getTargetAuthoritativeT() {
      return Math.min(...( [...this.players.values()].map((p) => p.furthestUpdateT)) );
    }
    private deletePlayer(playerId: number) {
      this.players.delete(playerId)
    }
    private updateAuthoritative(until: number) {
      while (this.authoritative.t <= until) {
        const activePlayers = [...this.players.values()].filter(
          (player) => player.actionQueue[0]?.t === this.authoritative.t
        );
        const actions: { player: number; action: T }[] = [];
        activePlayers.forEach((player) => {
          actions.push({
            player: player.id,
            action: player.actionQueue.shift()!.action,
          });
        });
        if (this.playersToDelete[0]?.t===this.authoritative.t) {
          const player = this.playersToDelete.shift()!.player
          this.deletePlayer(player)
          this.authoritative.despawn?.(player)
        }
        if (this.playersToSpawn[0]?.t===this.authoritative.t) {
          this.authoritative.spawn!(this.playersToSpawn.shift()!.player)
        }
        actions.forEach(move=>{
          this.authoritative.makeMove(move.player, move.action)
        })
        this.authoritative.tick();
      }
    }
  }
  