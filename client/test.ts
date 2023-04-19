import { SingleplayerClient, TicTacToe } from "./mod.ts";

const client = new SingleplayerClient(n=>new TicTacToe(), (state)=>console.log(state), ()=>console.log("started"), (f)=>{setInterval(f, 1000)})
client.playerInput(0)
client.playerInput(1)