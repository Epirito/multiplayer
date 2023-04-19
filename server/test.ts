import { BasicModel, LockstepClient } from "../client/mod.ts";
import { multiplayerServer } from "./server.ts";
import { TicTacToe } from "../client/mod.ts";
const client = new LockstepClient<number, TicTacToe>(
    n=>new BasicModel(new TicTacToe(),n), 
    state=>console.log(state), 
    ()=>{
        console.log("started")
        client.playerInput(0)
    }, 
    'ws://localhost:3000', 
    (f)=>{setInterval(f, 1000)})
setTimeout(()=>{
    client.ready()
}, 3000)