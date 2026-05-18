import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";

type Player = "X" | "O";
type Cell = Player | null;

interface GameRoom {
  id: string;
  players: { ws: WebSocket; player: Player }[];
  board: Cell[];
  current: Player;
}

type ClientMessage =
  | { type: "join" }
  | { type: "move"; index: number };


type ServerMessage =
  | { type: "waiting" }
  | { type: "start"; player: Player }
  | { type: "update"; board: Cell[]; current: Player }
  | { type: "game_over"; winner: Player | null; winCombo: number[] | null }
  | { type: "opponent_left" };



const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Cell[], player: Player): number[] | null {
  for (const combo of WINNING_COMBOS) {
    if (combo.every((i) => board[i] === player)) return combo;
  }
  return null;
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(room: GameRoom, msg: ServerMessage) {
  room.players.forEach(({ ws }) => send(ws, msg));
}



const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

const rooms = new Map<string, GameRoom>();
let waitingRoom: GameRoom | null = null;

console.log(`WebSocket szerver fut: ws://localhost:${PORT}`);

wss.on("connection", (ws: WebSocket) => {
  console.log("Új kapcsolat");

  ws.on("message", (data) => {
    let msg: ClientMessage;

    try {
      msg = JSON.parse(data.toString());
    } catch {
      console.error("Érvénytelen üzenet");
      return;
    }

    if (msg.type === "join") {
      handleJoin(ws);
    } else if (msg.type === "move") {
      handleMove(ws, msg.index);
    }
  });

  ws.on("close", () => {
    handleDisconnect(ws);
  });
});



function handleJoin(ws: WebSocket) {
  
  if (waitingRoom) {
    const room = waitingRoom;
    waitingRoom = null;

    room.players.push({ ws, player: "O" });
    rooms.set(room.id, room);

    room.players.forEach(({ ws: playerWs, player }) => {
      send(playerWs, { type: "start", player });
    });

    console.log(`Játék kezdődik: ${room.id}`);
  } else {
    
    const room: GameRoom = {
      id: uuidv4(),
      players: [{ ws, player: "X" }],
      board: Array(9).fill(null),
      current: "X",
    };

    waitingRoom = room;
    rooms.set(room.id, room);

    send(ws, { type: "waiting" });
    console.log(`Várakozó szoba létrehozva: ${room.id}`);
  }
}


function handleMove(ws: WebSocket, index: number) {
  const room = findRoomByWs(ws);
  if (!room) return;

  const playerEntry = room.players.find((p) => p.ws === ws);
  if (!playerEntry) return;

  if (playerEntry.player !== room.current) return;

  if (room.board[index] !== null) return;

  room.board[index] = room.current;

  

  const winCombo = checkWinner(room.board, room.current);



if (winCombo) {
  broadcast(room, { type: "update", board: room.board, current: room.current });
  broadcast(room, { type: "game_over", winner: room.current, winCombo });
  cleanupRoom(room);
  return;
}

if (room.board.every((cell) => cell !== null)) {
  // Döntetlennél is ugyanígy
  broadcast(room, { type: "update", board: room.board, current: room.current });
  broadcast(room, { type: "game_over", winner: null, winCombo: null });
  cleanupRoom(room);
  return;
}
  room.current = room.current === "X" ? "O" : "X";
  broadcast(room, { type: "update", board: room.board, current: room.current });
}


function handleDisconnect(ws: WebSocket) {
  console.log("Kapcsolat bontva");

  if (waitingRoom?.players[0].ws === ws) {
    rooms.delete(waitingRoom.id);
    waitingRoom = null;
    return;
  }

  const room = findRoomByWs(ws);
  if (!room) return;

  room.players
    .filter((p) => p.ws !== ws)
    .forEach(({ ws: otherWs }) => send(otherWs, { type: "opponent_left" }));

  cleanupRoom(room);
}


function findRoomByWs(ws: WebSocket): GameRoom | null {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.ws === ws)) return room;
  }
  return null;
}

function cleanupRoom(room: GameRoom) {
  rooms.delete(room.id);
  if (waitingRoom?.id === room.id) waitingRoom = null;
}