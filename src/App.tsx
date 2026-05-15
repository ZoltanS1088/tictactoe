

import { useState, useCallback } from "react";
import "./App.css";

type Player = "X" | "O";
type Cell = Player | null;

const WINNING_COMBOS: [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

interface Scores {
  X: number;
  O: number;
  D: number;
}

function checkWinner(board: Cell[], player: Player): [number, number, number] | null {
  for (const combo of WINNING_COMBOS) {
    if (combo.every((i) => board[i] === player)) return combo;
  }
  return null;
}

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
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [current, setCurrent] = useState<Player>("X");
  const [winCombo, setWinCombo] = useState<[number, number, number] | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [scores, setScores] = useState<Scores>({ X: 0, O: 0, D: 0 });

  const isOver = winCombo !== null || isDraw;

  const handleClick = useCallback(
    (index: number) => {
      if (isOver || board[index]) return;

      const next = [...board];
      next[index] = current;

      const win = checkWinner(next, current);
      if (win) {
        setBoard(next);
        setWinCombo(win);
        setScores((s) => ({ ...s, [current]: s[current] + 1 }));
        return;
      }

      if (next.every((v) => v !== null)) {
        setBoard(next);
        setIsDraw(true);
        setScores((s) => ({ ...s, D: s.D + 1 }));
        return;
      }

      setBoard(next);
      setCurrent(current === "X" ? "O" : "X");
    },
    [board, current, isOver]
  );

  const reset = () => {
    setBoard(Array(9).fill(null));
    setCurrent("X");
    setWinCombo(null);
    setIsDraw(false);
  };

  const statusText = winCombo
    ? `${current} nyert! 🎉`
    : isDraw
    ? "Döntetlen!"
    : `${current} következik`;

  return (
    <div className="ttt-wrap">
      <div className={`ttt-status${isOver ? " over" : ""}`}>
        {statusText}
      </div>

      <div className="ttt-board">
        {board.map((cell, i) => (
          <button
            key={i}
            className={`ttt-cell${winCombo?.includes(i) ? " win" : ""}`}
            onClick={() => handleClick(i)}
            disabled={!!cell || isOver}
          >
            {cell === "X" && <XIcon />}
            {cell === "O" && <OIcon />}
          </button>
        ))}
      </div>

      <div className="ttt-score-row">
        {(["X", "D", "O"] as const).map((key) => (
          <div key={key} className="ttt-score-card">
            <div className="ttt-score-label">
              {key === "D" ? "Döntetlen" : key}
            </div>
            <div className={`ttt-score-val${key === "X" ? " x" : key === "O" ? " o" : ""}`}>
              {scores[key]}
            </div>
          </div>
        ))}
      </div>

      <button className="ttt-reset-btn" onClick={reset}>
        Új játék
      </button>
    </div>
  );
}