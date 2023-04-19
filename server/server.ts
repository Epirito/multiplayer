import { Client, Game, Model } from "../client/mod.ts";
import {serve} from "./deps.ts";
export async function multiplayerServer<T,K extends Game<T,K>>(port = 3000, model?: Model<T,K>) {
    const players: Map<number, {
        lastMove: number, 
        ready: boolean, 
        emit: (type: string, msg: any)=>void
    }> = new Map()
    let started = false
    let nextId = 0
    function emit(type: string, msg: any) {
        players.forEach((player) => {
            player.emit(type, msg)
        })
    }
    function reqHandler(req: Request) {
        if (req.headers.get("upgrade") != "websocket") {
            return new Response(null, { status: 501 });
        }
        const { socket, response } = Deno.upgradeWebSocket(req);
        socket.onopen = ()=>{
            console.log("connected")
            if (started) {
                if (model?.renderable.serialize) {
                    socket.send(JSON.stringify({type: "world", msg: model.renderable.serialize()}))
                    emit("meta", {type: "spawn", player: nextId, t: model.renderable.t})
                }else {
                    socket.send("already_started")
                    socket.close()
                    return
                }
            }
            const id = nextId
            players.set(id, {
                ready: false, 
                lastMove: 0,
                emit(type: string, msg: any) {
                    socket.send(JSON.stringify({type, msg}))
                }
            })
            nextId += 1
            const kick = ()=> {
                if (!players.has(id)) return
                const lastMove = players.get(id)!.lastMove
                players.delete(id)
                emit("meta", {type: "delete", player: id, t: lastMove+1})
                model?.receiveMetaAction("delete", {player: id, t: lastMove+1})
            }
            socket.onclose = kick
            socket.onerror = kick
            socket.onmessage = (e)=>{
                if (e.data==="ready") {
                    players.get(id)!.ready = true
                    players.forEach((player)=> {
                        if (!player.ready) {
                            emit("ready", id)
                            return
                        }
                    })
                    players.forEach((player, respectiveId) => {
                        started = true
                        player.emit("start", {
                            id: respectiveId,
                            nPlayers: players.size
                        })
                    })
                }else if (e.data==="not_ready") {
                    players.get(id)!.ready = false
                    emit("not_ready", id)
                }else {
                    const parsed = JSON.parse(e.data)
                    switch(parsed.type) {
                        case "moved":
                            players.get(id)!.lastMove = parsed.msg.t
                            emit("moved", {player: id, move: parsed.msg.move, t: parsed.msg.t})
                            model?.receiveAction(id, parsed.msg.move, parsed.msg.t)
                    }
                }
            }
        }
        return response;
    }
    await serve(reqHandler, {
        port,
    })
}
