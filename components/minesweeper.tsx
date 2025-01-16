import React, { useState, useEffect } from 'react';
import styles from '../styles/minesweeper.module.css';

interface Cell {
  value: number;
  revealed: boolean;
  flagged: boolean;
}

const Minesweeper = () => {
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const initializeBoard = () => {
    const newBoard: Cell[][] = Array(8).fill(null).map(() => 
      Array(8).fill(null).map(() => ({
        value: 0,
        revealed: false,
        flagged: false
      }))
    );
    let minesPlaced = 0;
    while (minesPlaced < 10) {
      const x = Math.floor(Math.random() * 8);
      const y = Math.floor(Math.random() * 8);
      if (newBoard[x][y].value !== -1) {
        newBoard[x][y].value = -1;
        minesPlaced++;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            if (x + i >= 0 && x + i < 8 && y + j >= 0 && y + j < 8) {
              if (newBoard[x + i][y + j].value !== -1) {
                newBoard[x + i][y + j].value += 1;
              }
            }
          }
        }
      }
    }
    setBoard(newBoard);
    setGameOver(false);
    setGameWon(false);
  };

  useEffect(() => {
    initializeBoard();
  }, []);

  const revealCell = (x: number, y: number) => {
    if (x < 0 || x >= 8 || y < 0 || y >= 8 || board[x][y].revealed || board[x][y].flagged) return;

    const newBoard = [...board];
    newBoard[x][y].revealed = true;
    setBoard(newBoard);

    if (board[x][y].value === 0) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          revealCell(x + i, y + j);
        }
      }
    }
  };

  const handleClick = (x: number, y: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (gameOver || gameWon) return;

    if (e.type === 'contextmenu') {
      const newBoard = [...board];
      newBoard[x][y].flagged = !newBoard[x][y].flagged;
      setBoard(newBoard);
      return;
    }

    if (board[x][y].flagged) return;

    if (board[x][y].value === -1) {
      const newBoard = [...board];
      newBoard.forEach(row => row.forEach(cell => cell.revealed = true));
      setBoard(newBoard);
      setGameOver(true);
    } else {
      revealCell(x, y);
      const unrevealedSafeCells = board.flat().filter(
        cell => !cell.revealed && cell.value !== -1
      ).length;
      if (unrevealedSafeCells === 0) {
        setGameWon(true);
      }
    }
  };

  const getCellContent = (cell: Cell) => {
    if (cell.flagged) return '🚩';
    if (!cell.revealed) return '';
    if (cell.value === -1) return '💣';
    return cell.value || '';
  };

  const getCellStyle = (cell: Cell) => {
    return `${styles.cell} ${cell.revealed ? styles.revealed : ''} ${
      gameOver && cell.value === -1 ? styles.mine : ''
    }`;
  };

  return (
    <div className={styles.minesweeperContainer}>
      <div className={styles.board}>
        {board.map((row, i) => (
          <div key={i} className={styles.row}>
            {row.map((cell, j) => (
              <button
                key={`${i}-${j}`}
                className={getCellStyle(cell)}
                onClick={(e) => handleClick(i, j, e)}
                onContextMenu={(e) => handleClick(i, j, e)}
              >
                {getCellContent(cell)}
              </button>
            ))}
          </div>
        ))}
      </div>
      {(gameOver || gameWon) && (
        <div className={styles.popup}>
          <div className={styles.popupContent}>
            <h2>{gameWon ? 'Congratulations!' : 'Game Over!'}</h2>
            <button onClick={initializeBoard}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Minesweeper;