import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

type Player = "X" | "O";
type Cell = Player | null;

type Screen = "menu" | "waiting" | "playing" | "game_over";

type ServerMessage =
  | { type: "waiting" }
  | { type: "start"; player: Player }
  | { type: "update"; board: Cell[]; current: Player }
  | { type: "game_over"; winner: Player | null; winCombo: number[] | null }
  | { type: "opponent_left" };

const WS_URL = "ws://localhost:3001";

// ai generated icons

const XIcon = () => (
  <svg viewBox="0 0 56 56" width={52} height={52}>
    <line x1="10" y1="10" x2="46" y2="46" stroke="#E24B4A" strokeWidth={5} strokeLinecap="round" />
    <line x1="46" y1="10" x2="10" y2="46" stroke="#E24B4A" strokeWidth={5} strokeLinecap="round" />
  </svg>
);

const OIcon = () => (
  <svg viewBox="0 0 56 56" width={52} height={52}>
    <circle cx={28} cy={28} r={20} stroke="#185FA5" strokeWidth={5} fill="none" />
  </svg>
);


export default function TicTacToe() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [current, setCurrent] = useState<Player>("X");
  const [winCombo, setWinCombo] = useState<number[] | null>(null);
  const [winner, setWinner] = useState<Player | null | "draw">(null);

  const wsRef = useRef<WebSocket | null>(null);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "waiting":
        setScreen("waiting");
        break;

      case "start":
        setMyPlayer(msg.player);
        setBoard(Array(9).fill(null));
        setWinCombo(null);
        setWinner(null);
        setCurrent("X");
        setScreen("playing");
        break;

      case "update":
        setBoard(msg.board);
        setCurrent(msg.current);
        break;

      case "game_over":
        setWinCombo(msg.winCombo);
        setWinner(msg.winner ?? "draw");
        setScreen("game_over");
        break;

      case "opponent_left":
        setScreen("game_over");
        setWinner(null);
        break;
    }
  }, []);

  function connect() {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join" }));
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        handleMessage(msg);
      } catch {
        console.error("Érvénytelen üzenet a szervertől");
      }
    };

    ws.onclose = () => {
      console.log("WebSocket kapcsolat bontva");
    };
  }

  function sendMove(index: number) {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "move", index }));
  }

  function playAgain() {
    wsRef.current?.close();
    setBoard(Array(9).fill(null));
    setWinCombo(null);
    setWinner(null);
    setMyPlayer(null);
    setCurrent("X");
    connect();
  }

  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  
  const isMyTurn = screen === "playing" && current === myPlayer;
  const statusMsg = isMyTurn ? "Te jössz!" : "Ellenfél gondolkodik...";


  if (screen === "menu") {
    return (
      <div className="ttt-wrap">
        <h1 className="ttt-title">Tic-Tac-Toe</h1>
        <p className="ttt-subtitle">Multiplayer</p>
        <button className="ttt-primary-btn" onClick={connect}>
          Játék keresése
        </button>
      </div>
    );
  }

  if (screen === "waiting") {
    return (
      <div className="ttt-wrap">
        <div className="ttt-spinner" />
        <p className="ttt-status">Várakozás az ellenfélre...</p>
      </div>
    );
  }

  if (screen === "game_over") {
    const msg =
      winner === "draw"
        ? "Döntetlen!"
        : winner === myPlayer
        ? "Nyertél! 🎉"
        : winner === null
        ? "Az ellenfél kilépett."
        : "Vesztettél.";

    return (
      <div className="ttt-wrap">
        <div className="ttt-board">
          {board.map((cell, i) => (
            <button
              key={i}
              className={`ttt-cell taken${winCombo?.includes(i) ? " win" : ""}`}
              disabled
            >
              {cell === "X" && <XIcon />}
              {cell === "O" && <OIcon />}
            </button>
          ))}
        </div>
        <p className="ttt-status over">{msg}</p>
        <button className="ttt-primary-btn" onClick={playAgain}>
          Új játék
        </button>
      </div>
    );
  }

  return (
    <div className="ttt-wrap">
      <div className="ttt-player-badge">
        Te vagy: <span className={myPlayer === "X" ? "x" : "o"}>{myPlayer}</span>
      </div>

      <div className="ttt-status">{statusMsg}</div>

      <div className="ttt-board">
        {board.map((cell, i) => (
          <button
            key={i}
            className={`ttt-cell${cell ? " taken" : ""}${winCombo?.includes(i) ? " win" : ""}`}
            onClick={() => sendMove(i)}
            disabled={!!cell || !isMyTurn}
          >
            {cell === "X" && <XIcon />}
            {cell === "O" && <OIcon />}
          </button>
        ))}
      </div>
    </div>
  );
}