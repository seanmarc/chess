import { useState, useCallback, useMemo } from 'react';
import { Chess, Move, Piece, Square } from 'chess.js';

interface PieceValues {
  [key: string]: number;
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

const SQUARE_INDICES = new Map<string, number>();
for (let rank = 0; rank < 8; rank++) {
  for (let file = 0; file < 8; file++) {
    const square = String.fromCharCode(97 + file) + (8 - rank) as Square;
    SQUARE_INDICES.set(square, rank * 8 + file);
  }
}

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

const KING_LATE_GAME_SQUARE_TABLE: number[] = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -50,-40,-30,-20,-20,-30,-40,-50
];

const PAWN_SQUARE_TABLE: number[] = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 20, 20, 30, 30, 20, 20, 10,
  5,  5,  5, 25, 25,  5,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5,  0,  0,  0,  0,  0,  0,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const BISHOP_SQUARE_TABLE: number[] = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
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

// Hippo opening moves (Modern Defence/Hippo setup)
// This will guide the engine to play this opening when playing as black
const HIPPO_OPENING_BLACK: string[] = [
  "g6", "Bg7", "d6", "Nd7", "e6", "Ngf7", "b6", "Bb7"
];

// For white, we'll use a corresponding setup
const HIPPO_OPENING_WHITE: string[] = [
  "g3", "Bg2", "d3", "Nd2", "e3", "Ngf3", "b3", "Bb2"
];

const DEPTH: number = 3;

const useChessEngine = (initialFen?: string): ChessEngineState & { isLoading: boolean } => {
  const [game, setGame] = useState<Chess>(new Chess(initialFen));
  const [status, setStatus] = useState<string>('Ready');
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Cache for position evaluations to avoid recalculating
  const [evalCache] = useState<Map<string, number>>(new Map());
  
  // Memoized piece-square tables for faster lookup (flipped for black)
  const flippedTables = useMemo(() => {
    return {
      knight: [...KNIGHT_SQUARE_TABLE].reverse(),
      pawn: [...PAWN_SQUARE_TABLE].reverse(),
      bishop: [...BISHOP_SQUARE_TABLE].reverse(),
      king: [...KING_SQUARE_TABLE].reverse()
    };
  }, []);

  // Function to get piece-square table value efficiently
  const getPieceSquareValue = useCallback((piece: Piece, squareIndex: number): number => {
    if (piece.color === 'w') {
      switch (piece.type) {
        case 'n': return KNIGHT_SQUARE_TABLE[squareIndex];
        case 'p': return PAWN_SQUARE_TABLE[squareIndex];
        case 'b': return BISHOP_SQUARE_TABLE[squareIndex];
        case 'k': return KING_SQUARE_TABLE[squareIndex];
        default: return 0;
      }
    } else {
      // Flipped tables for black pieces
      switch (piece.type) {
        case 'n': return flippedTables.knight[squareIndex];
        case 'p': return flippedTables.pawn[squareIndex];
        case 'b': return flippedTables.bishop[squareIndex];
        case 'k': return flippedTables.king[squareIndex];
        default: return 0;
      }
    }
  }, [flippedTables]);

  // Optimized board evaluation
  const evaluateBoard = useCallback((): number => {
    const fen = game.fen();
    
    // Check cache first
    if (evalCache.has(fen)) {
      return evalCache.get(fen)!;
    }
    
    // Terminal states
    if (game.isCheckmate()) {
      return game.turn() === 'w' ? -Infinity : Infinity;
    }
    if (game.isDraw()) {
      return 0;
    }

    let score: number = 0;
    const board: (Piece | null)[][] = game.board();

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          const squareIndex = rank * 8 + file;
          
          // Material value
          const pieceValue = PIECE_VALUES[piece.type];
          score += piece.color === 'w' ? pieceValue : -pieceValue;
          
          // Position value (only calculate for important pieces to save time)
          const positionBonus = getPieceSquareValue(piece, squareIndex);
          score += piece.color === 'w' ? positionBonus : -positionBonus;
        }
      }
    }

    // Simple mobility evaluation (just count legal moves)
    const whiteMobility = game.turn() === 'w' ? game.moves().length : 0;
    const blackMobility = game.turn() === 'b' ? game.moves().length : 0;
    score += whiteMobility - blackMobility;

    // King safety (simplified)
    if (game.inCheck()) {
      score += game.turn() === 'w' ? -50 : 50;
    }

    // Cache the evaluation
    evalCache.set(fen, score);
    return score;
  }, [game, evalCache, getPieceSquareValue]);

  // Simplified detection of passed pawns
  const countPassedPawns = useCallback((): number => {
    let whitePassedPawns = 0;
    let blackPassedPawns = 0;
    const board = game.board();
    
    // Simplified check - just count pawns past the 5th rank for each side
    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 3; rank++) {
        if (board[rank][file]?.type === 'p' && board[rank][file]?.color === 'w') {
          whitePassedPawns++;
        }
      }
      for (let rank = 5; rank < 8; rank++) {
        if (board[rank][file]?.type === 'p' && board[rank][file]?.color === 'b') {
          blackPassedPawns++;
        }
      }
    }
    
    return whitePassedPawns - blackPassedPawns;
  }, [game]);

  // Order moves for better alpha-beta pruning
  const orderMoves = useCallback((moves: Move[]): Move[] => {
    return moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      
      // Captures are examined first
      if (a.captured) scoreA += PIECE_VALUES[a.captured] * 10;
      if (b.captured) scoreB += PIECE_VALUES[b.captured] * 10;
      
      // Promotions are good
      if (a.promotion) scoreA += PIECE_VALUES[a.promotion];
      if (b.promotion) scoreB += PIECE_VALUES[b.promotion];
      
      // Check moves are interesting
      if (a.san.includes('+')) scoreA += 50;
      if (b.san.includes('+')) scoreB += 50;
      
      return scoreB - scoreA;
    });
  }, []);

  // Optimized minimax with alpha-beta pruning
  const minimax = useCallback((
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean
  ): MinimaxResult => {
    // Base case: leaf node or terminal position
    if (depth === 0 || game.isGameOver()) {
      return { score: evaluateBoard(), move: null };
    }

    let moves: Move[] = game.moves({ verbose: true });
    let bestMove: Move | null = null;
    
    // Order moves for better pruning
    moves = orderMoves(moves);

    if (maximizingPlayer) {
      let maxEval: number = -Infinity;
      for (const move of moves) {
        game.move(move);
        
        // Immediate checkmate is best
        if (game.isCheckmate()) {
          game.undo();
          return { score: Infinity, move };
        }
        
        const evalResult = minimax(depth - 1, alpha, beta, false);
        const evalScore = evalResult.score;
        game.undo();
        
        if (evalScore > maxEval) {
          maxEval = evalScore;
          bestMove = move;
        }
        
        alpha = Math.max(alpha, maxEval);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      
      return { score: maxEval, move: bestMove };
    } else {
      let minEval: number = Infinity;
      for (const move of moves) {
        game.move(move);
        
        // Immediate checkmate is worst
        if (game.isCheckmate()) {
          game.undo();
          return { score: -Infinity, move };
        }
        
        const evalResult = minimax(depth - 1, alpha, beta, true);
        const evalScore = evalResult.score;
        game.undo();
        
        if (evalScore < minEval) {
          minEval = evalScore;
          bestMove = move;
        }
        
        beta = Math.min(beta, minEval);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      
      return { score: minEval, move: bestMove };
    }
  }, [game, evaluateBoard, orderMoves]);

  // Check if we should use a hippo opening move
  const getHippoMove = useCallback((): Move | null => {
    // Only use the opening book in the first 8 moves
    const moveHistory = game.history();
    const moveCount = moveHistory.length;
    
    if (moveCount < 8) {
      const color = game.turn();
      const openingMoves = color === 'w' ? HIPPO_OPENING_WHITE : HIPPO_OPENING_BLACK;
      
      // Try to make the corresponding hippo move
      try {
        // Calculate which move in the opening sequence we are on
        const openingIndex = Math.floor(moveCount / 2);
        if (openingIndex < openingMoves.length) {
          const hippoMove = openingMoves[openingIndex];
          // Check if the move is legal in the current position
          const legalMoves = game.moves({ verbose: true });
          const move = legalMoves.find(m => m.san === hippoMove || m.lan === hippoMove);
          if (move) {
            return move;
          }
        }
      } catch (error) {
        console.error('Error applying hippo move:', error);
      }
    }
    
    return null;
  }, [game]);

  // Make engine move (now with Hippo opening book)
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
    
    // First check if we should make a hippo opening move
    const hippoMove = getHippoMove();
    
    if (hippoMove) {
      // Use the hippo move from our opening book
      setTimeout(() => {
        if (game.moves({verbose: true}).includes(hippoMove)) {
          game.move(hippoMove);
          setLastMove(hippoMove);
          setStatus(`Engine moved: ${hippoMove.san} (Hippo opening)`);
          setIsLoading(false);
        }
      }, 100);
      return hippoMove;
    }
    
    // Otherwise use the minimax algorithm
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
  }, [game, minimax, getHippoMove]);

  // Update game position
  const updatePosition = useCallback((fen: string): void => {
    game.load(fen);
    setStatus('Position updated');
    // Clear evaluation cache when position is updated
    evalCache.clear();
  }, [game, evalCache]);

  return {
    getEngineMove,
    updatePosition,
    status,
    lastMove,
    isLoading
  };
};

export default useChessEngine;