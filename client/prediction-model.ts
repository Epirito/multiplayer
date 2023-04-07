/*




NOT READY FOR USE YET






*/


import { Game } from "./game.ts";

export class Player<T> {
    actionQueue: { action: T; t: number }[] = [];
    furthestUpdateT = -1;
    constructor(public id: number, readonly name: string) {}
  }
  
export class PredictionModel<T, K extends Game<T,K>> {
    players: Player<T>[];
    playersToDelete: {player: number, t: number}[] = []
    authoritative: K;
    prediction: K;
    bufferedRollback = false;
    constructor(initGame: (nPlayers: number) => K, nPlayers: number) {
      this.authoritative = initGame(nPlayers);
      this.prediction = this.authoritative.copy()
      this.players = Array(nPlayers)
        .fill(0)
        .map((_, i) => new Player(i));
    }
    /**
     * translate the incoming player ids to local ones by reversing the player 
     * deletions that still haven't been applied to the local model
     */
    private translatePlayerId(playerId: number) {
      [...this.playersToDelete].reverse().forEach(({player}) => {
        if (playerId >= player) {
          playerId++
        }
      })
      return playerId
    }
    receiveMetaAction(type: string, data: any) {
      debugger
      // meta actions operate on the model itself, not on the game state
      switch(type) {
        case 'delete': {
          const {player, t} = data
          this.players[this.translatePlayerId(player)].furthestUpdateT = t
          this.playersToDelete.push({player, t})
        }
        break
        case 'spawn': {
          const {player, name, t} = data as {player: number, name: string, t: number}
          this.players.set(player, new Player(player, name))
          this.playersToSpawn.push({player, name, t})
        }
      }
    }
    receiveAction(playerId: number, action: T | null, t: number, myOwnAction=true) {
      playerId = this.translatePlayerId(playerId)
      const player = this.players[playerId];
      player.furthestUpdateT = t;
      if (action!==null) {
        player.actionQueue.push({ action, t });
      }
      this.updateAuthoritative(this.getTargetAuthoritativeT());
      // conditions that invalidate the current prediction:
      // 1. non-null actions that are older than the current prediction
      // 2. authoritative updates that are newer than the current prediction
      const rollbackRequired = (action!==null && t < this.prediction.t) || this.authoritative.t > this.prediction.t
      if (myOwnAction) {
        // rollbacks required by other players are buffered until the next tick to prevent unnecessary rollbacks
        if (this.bufferedRollback) {
          this.bufferedRollback = false;
          this.updatePrediction(this.prediction.t, true);
        }else {
          this.updatePrediction(this.getTargetPredictionT(), rollbackRequired);
        }
      }else {
        // accumulate rollbacks required by other players
        this.bufferedRollback ||= rollbackRequired
      }
    }
    private getTargetPredictionT() {
      return Math.max(...this.players.map((p) => p.furthestUpdateT));
    }
    private getTargetAuthoritativeT() {
      return Math.min(...this.players.map((p) => p.furthestUpdateT));
    }
    private deletePlayer(playerId: number) {
      this.players.splice(playerId, 1)
      for(let i = playerId; i < this.players.length; i++) {
        this.players[i].id--
      }
      this.bufferedRollback = true
    }
    private updateAuthoritative(until: number) {
      while (this.authoritative.t <= until) {
        const activePlayers = this.players.filter(
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
          this.deletePlayer(this.playersToDelete.shift()!.player)
        }
        if (this.playersToSpawn[0]?.t===this.authoritative.t) {
          this.authoritative.spawn(this.playersToSpawn.shift()!.player)
        actions.forEach(move=>{
          this.authoritative.makeMove(move.player, move.action)
        })
        this.authoritative.tick();
      }
    }
    private updatePrediction(until: number, rollback: boolean) {
      const nextActionIdxByPlayer = new Map(this.players
        .filter((player) => player.actionQueue.length > 0)
        .map((player) => [player.id, 0]));
      if (rollback) {
        this.prediction = this.authoritative.copy();
      }
      while (this.prediction.t <= until) {
        const currentActions: { player: number; action: T }[] = [];
        nextActionIdxByPlayer.forEach((nextAction, player) => {
          if (
            this.players[player].actionQueue[nextAction]?.t === this.prediction.t
          ) {
            currentActions.push({
              player,
              action: this.players[player].actionQueue[nextAction].action,
            });
            nextActionIdxByPlayer.set(player, nextAction + 1);
          }
        });
        currentActions.forEach(move=>{
          this.prediction.makeMove(move.player, move.action)
        })
        this.prediction.tick();
      }
    }
  }
  