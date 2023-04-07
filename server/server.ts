import {serve} from "./deps.ts";
export async function multiplayerServer(port = 3000) {
    const players: {lastMove: number, ready: boolean, emit: (type: string, msg: any)=>void, setId: (newId: number)=>void}[] = []
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
                socket.send("already_started")
                socket.close()
                return
            }
            let id = nextId
            players[id] = {
                ready: false, 
                lastMove: 0,
                emit(type: string, msg: any) {
                    socket.send(JSON.stringify({type, msg}))
                },
                setId: (newId: number) => {
                    id = newId
                }
            }
            nextId += 1
            socket.onclose = ()=> {
                players.splice(id, 1)
                for(let i = id; i < players.length; i++) {
                    players[i].setId(i)
                }
                emit("meta", {type: "delete", player: id, t: players[id].lastMove+1})
            }
            socket.onerror = console.log
            socket.onmessage = (e)=>{
                if (e.data==="ready") {
                    players[id]!.ready = true
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
                            nPlayers: players.length
                        })
                    })
                }else if (e.data==="not_ready") {
                    players[id].ready = false
                    emit("not_ready", id)
                }else {
                    const parsed = JSON.parse(e.data)
                    switch(parsed.type) {
                        case "moved":
                            players[id].lastMove = parsed.msg.t
                            emit("moved", {player: id, move: parsed.msg.move, t: parsed.msg.t})
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