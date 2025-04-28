import { useState, useCallback } from 'react';
import { Chess, Move, Piece, Square } from 'chess.js';

interface PieceValues {
  [key: string]: number;
}

interface PassedPawns {
  white: number;
  black: number;
}

interface MinimaxResult {
  score: number;
  move: Move | null;
}

interface ChessEngineState {
  getEngineMove: (fen?: string) => Promise<Move | null>;
  updatePosition: (fen: string) => void;
  status: string;
  lastMove: Move | null;
}

// Piece values
const PIECE_VALUES: PieceValues = {
  'p': 100,
  'n': 320,
  'b': 330,
  'r': 500,
  'q': 900,
  'k': 20000
};

// Piece-square tables for knights and kings
const KNIGHT_SQUARE_TABLE: number[] = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const KING_SQUARE_TABLE: number[] = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

const DEPTH: number = 3;

const useChessEngine = (initialFen?: string): ChessEngineState & { isLoading: boolean } => {
  const [game, setGame] = useState<Chess>(new Chess(initialFen));
  const [status, setStatus] = useState<string>('Ready');
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Evaluate the board position
  const evaluateBoard = useCallback((): number => {
    if (game.isCheckmate()) {
      return game.turn() === 'w' ? -Infinity : Infinity;
    }

    let score: number = 0;
    const board: (Piece | null)[][] = game.board();

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          const squareIndex: number = rank * 8 + file;
          const pieceValue: number = PIECE_VALUES[piece.type];
          let positionBonus: number = 0;

          // Piece value
          score += piece.color === 'w' ? pieceValue : -pieceValue;

          // Piece-square bonuses
          if (piece.type === 'n') {
            positionBonus = KNIGHT_SQUARE_TABLE[squareIndex];
          } else if (piece.type === 'k') {
            positionBonus = KING_SQUARE_TABLE[squareIndex];
          }

          score += piece.color === 'w' ? positionBonus : -positionBonus;

          // Mobility
          const moves: Move[] = game.moves({ 
            square: String.fromCharCode(97 + file) + (8 - rank) as Square, 
            verbose: true 
          });
          score += piece.color === 'w' ? moves.length * 2 : -moves.length * 2;
        }
      }
    }

    // King safety
    const kingAttacks: number = game.inCheck() ? (game.turn() === 'w' ? -50 : 50) : 0;
    score += kingAttacks;

    // Pawn structure
    const passedPawns: PassedPawns = detectPassedPawns();
    score += passedPawns.white * 50 - passedPawns.black * 50;

    return score;
  }, [game]);

  // Detect passed pawns
  const detectPassedPawns = useCallback((): PassedPawns => {
    const board: (Piece | null)[][] = game.board();
    const passed: PassedPawns = { white: 0, black: 0 };

    for (let file = 0; file < 8; file++) {
      let whitePawn: number = -1, blackPawn: number = -1;
      for (let rank = 0; rank < 8; rank++) {
        const piece = board[rank][file];
        if (piece && piece.type === 'p') {
          if (piece.color === 'w') whitePawn = rank;
          else blackPawn = rank;
        }
      }
      if (whitePawn !== -1 && (blackPawn === -1 || blackPawn < whitePawn)) {
        if (file > 0 && file < 7) {
          const left: boolean = board[whitePawn][file-1]?.type !== 'p';
          const right: boolean = board[whitePawn][file+1]?.type !== 'p';
          if (left && right) passed.white++;
        } else {
          passed.white++;
        }
      }
      if (blackPawn !== -1 && (whitePawn === -1 || whitePawn > blackPawn)) {
        if (file > 0 && file < 7) {
          const left: boolean = board[blackPawn][file-1]?.type !== 'p';
          const right: boolean = board[blackPawn][file+1]?.type !== 'p';
          if (left && right) passed.black++;
        } else {
          passed.black++;
        }
      }
    }
    return passed;
  }, [game]);

  // Minimax with alpha-beta pruning
  const minimax = useCallback((
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean
  ): MinimaxResult => {
    if (depth === 0 || game.isGameOver()) {
      return { score: evaluateBoard(), move: null };
    }

    const moves: Move[] = game.moves({ verbose: true });
    let bestMove: Move | null = null;

    if (maximizingPlayer) {
      let maxEval: number = -Infinity;
      for (const move of moves) {
        game.move(move);
        if (game.isCheckmate()) {
          game.undo();
          return { score: Infinity, move };
        }
        const evalScore: number = minimax(depth - 1, alpha, beta, false).score;
        game.undo();
        if (evalScore > maxEval) {
          maxEval = evalScore;
          bestMove = move;
        }
        alpha = Math.max(alpha, maxEval);
        if (beta <= alpha) break;
      }
      return { score: maxEval, move: bestMove };
    } else {
      let minEval: number = Infinity;
      for (const move of moves) {
        game.move(move);
        if (game.isCheckmate()) {
          game.undo();
          return { score: -Infinity, move };
        }
        const evalScore: number = minimax(depth - 1, alpha, beta, true).score;
        game.undo();
        if (evalScore < minEval) {
          minEval = evalScore;
          bestMove = move;
        }
        beta = Math.min(beta, minEval);
        if (beta <= alpha) break;
      }
      return { score: minEval, move: bestMove };
    }
  }, [game, evaluateBoard]);

  // Make engine move
  const getEngineMove = useCallback(async (fen?: string): Promise<Move | null> => {
    if (fen) {
      game.load(fen);
    }

    if (game.isGameOver()) {
      setStatus('Game Over: ' + (game.isCheckmate() ? 'Checkmate' : 'Draw'));
      return null;
    }

    setStatus('Engine thinking...');
    setIsLoading(true);
    const result: MinimaxResult = await new Promise((resolve) => {
      setTimeout(() => {
        const move = minimax(DEPTH, -Infinity, Infinity, game.turn() === 'w');
        resolve(move);
      }, 100);
    });

    setIsLoading(false);

    if (result.move) {
      game.move(result.move);
      setLastMove(result.move);
      setStatus(`Engine moved: ${result.move.san}`);
      return result.move;
    } else {
      setStatus('No valid moves available');
      return null;
    }
  }, [game, minimax]);

  // Update game position
  const updatePosition = useCallback((fen: string): void => {
    game.load(fen);
    setStatus('Position updated');
  }, [game]);

  return {
    getEngineMove,
    updatePosition,
    status,
    lastMove,
    isLoading
  };
};

export default useChessEngine;