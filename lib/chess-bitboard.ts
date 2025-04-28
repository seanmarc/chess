export type PieceColor = "white" | "black"
export type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn"

export interface ChessPiece {
  type: PieceType
  color: PieceColor
}

export interface ChessMove {
  from: number
  to: number
  piece: ChessPiece
  capturedPiece?: ChessPiece
}

// Initialize the chess board with starting position
export function initializeBitboard(): ChessPiece[] {
  const board: (ChessPiece | null)[] = Array(64).fill(null)

  // Set up pawns
  for (let i = 0; i < 8; i++) {
    board[8 + i] = { type: "pawn", color: "black" }
    board[48 + i] = { type: "pawn", color: "white" }
  }

  // Set up rooks
  board[0] = { type: "rook", color: "black" }
  board[7] = { type: "rook", color: "black" }
  board[56] = { type: "rook", color: "white" }
  board[63] = { type: "rook", color: "white" }

  // Set up knights
  board[1] = { type: "knight", color: "black" }
  board[6] = { type: "knight", color: "black" }
  board[57] = { type: "knight", color: "white" }
  board[62] = { type: "knight", color: "white" }

  // Set up bishops
  board[2] = { type: "bishop", color: "black" }
  board[5] = { type: "bishop", color: "black" }
  board[58] = { type: "bishop", color: "white" }
  board[61] = { type: "bishop", color: "white" }

  // Set up queens
  board[3] = { type: "queen", color: "black" }
  board[59] = { type: "queen", color: "white" }

  // Set up kings
  board[4] = { type: "king", color: "black" }
  board[60] = { type: "king", color: "white" }

  return board as ChessPiece[]
}

// Convert board to string representation
export function boardToString(board: (ChessPiece | null)[]): string {
  return board
    .map((piece) => {
      if (!piece) return "0"

      let char = ""
      switch (piece.type) {
        case "king":
          char = "k"
          break
        case "queen":
          char = "q"
          break
        case "rook":
          char = "r"
          break
        case "bishop":
          char = "b"
          break
        case "knight":
          char = "n"
          break
        case "pawn":
          char = "p"
          break
      }

      return piece.color === "white" ? char.toUpperCase() : char
    })
    .join("")
}

// Parse string representation to board
export function stringToBoard(boardStr: string): (ChessPiece | null)[] {
  const board: (ChessPiece | null)[] = Array(64).fill(null)

  for (let i = 0; i < 64 && i < boardStr.length; i++) {
    const char = boardStr[i]
    if (char === "0") continue

    const isWhite = char === char.toUpperCase()
    const lowerChar = char.toLowerCase()

    let type: PieceType
    switch (lowerChar) {
      case "k":
        type = "king"
        break
      case "q":
        type = "queen"
        break
      case "r":
        type = "rook"
        break
      case "b":
        type = "bishop"
        break
      case "n":
        type = "knight"
        break
      case "p":
        type = "pawn"
        break
      default:
        continue // Skip invalid characters
    }

    board[i] = {
      type,
      color: isWhite ? "white" : "black",
    }
  }

  return board
}

// Get piece at a specific index
export function getPieceAtIndex(board: (ChessPiece | null)[], index: number): ChessPiece | null {
  if (index < 0 || index >= 64) return null
  return board[index]
}

// Convert between coordinates and index
export function coordsToIndex(row: number, col: number): number {
  return row * 8 + col
}

export function indexToCoords(index: number): [number, number] {
  return [Math.floor(index / 8), index % 8]
}

// Convert square to algebraic notation
export function squareToAlgebraic(index: number): string {
  const [row, col] = indexToCoords(index)
  const file = String.fromCharCode(97 + col) // 'a' to 'h'
  const rank = 8 - row // 1 to 8
  return `${file}${rank}`
}

// Make a move on the board
export function makeMove(board: (ChessPiece | null)[], fromIndex: number, toIndex: number): (ChessPiece | null)[] {
  const newBoard = [...board]
  const piece = newBoard[fromIndex]

  if (!piece) return newBoard

  newBoard[toIndex] = piece
  newBoard[fromIndex] = null

  return newBoard
}

// Get all legal moves for a piece
export function getLegalMoves(board: (ChessPiece | null)[], turn: PieceColor): ChessMove[] {
  const moves: ChessMove[] = []

  // For simplicity, we'll just implement basic moves for each piece type
  // A real implementation would include all chess rules including castling, en passant, etc.

  for (let i = 0; i < 64; i++) {
    const piece = board[i]
    if (!piece || piece.color !== turn) continue

    const [row, col] = indexToCoords(i)

    switch (piece.type) {
      case "pawn":
        // Basic pawn moves (no en passant, no promotion)
        const direction = piece.color === "white" ? -1 : 1
        const oneStep = coordsToIndex(row + direction, col)

        // Move forward one square
        if (oneStep >= 0 && oneStep < 64 && !board[oneStep]) {
          moves.push({ from: i, to: oneStep, piece })
        }

        // Move forward two squares from starting position
        if ((piece.color === "white" && row === 6) || (piece.color === "black" && row === 1)) {
          const twoStep = coordsToIndex(row + 2 * direction, col)
          if (!board[oneStep] && !board[twoStep]) {
            moves.push({ from: i, to: twoStep, piece })
          }
        }

        // Capture diagonally
        for (const offset of [-1, 1]) {
          const captureIndex = coordsToIndex(row + direction, col + offset)
          if (captureIndex >= 0 && captureIndex < 64) {
            const capturedPiece = board[captureIndex]
            if (capturedPiece && capturedPiece.color !== piece.color) {
              moves.push({
                from: i,
                to: captureIndex,
                piece,
                capturedPiece,
              })
            }
          }
        }
        break

      case "knight":
        // Knight moves
        const knightOffsets = [
          [-2, -1],
          [-2, 1],
          [-1, -2],
          [-1, 2],
          [1, -2],
          [1, 2],
          [2, -1],
          [2, 1],
        ]

        for (const [rowOffset, colOffset] of knightOffsets) {
          const newRow = row + rowOffset
          const newCol = col + colOffset

          if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetIndex = coordsToIndex(newRow, newCol)
            const targetPiece = board[targetIndex]

            if (!targetPiece || targetPiece.color !== piece.color) {
              moves.push({
                from: i,
                to: targetIndex,
                piece,
                capturedPiece: targetPiece || undefined,
              })
            }
          }
        }
        break

      // For simplicity, we'll implement basic moves for other pieces
      // A complete implementation would be more complex
      case "king":
        // King moves (no castling)
        const kingOffsets = [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1],
        ]

        for (const [rowOffset, colOffset] of kingOffsets) {
          const newRow = row + rowOffset
          const newCol = col + colOffset

          if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetIndex = coordsToIndex(newRow, newCol)
            const targetPiece = board[targetIndex]

            if (!targetPiece || targetPiece.color !== piece.color) {
              moves.push({
                from: i,
                to: targetIndex,
                piece,
                capturedPiece: targetPiece || undefined,
              })
            }
          }
        }
        break

      // Simplified implementations for other pieces
      case "rook":
      case "bishop":
      case "queen":
        // Directions for sliding pieces
        const directions: [number, number][] = []

        if (piece.type === "rook" || piece.type === "queen") {
          // Horizontal and vertical
          directions.push([-1, 0], [1, 0], [0, -1], [0, 1])
        }

        if (piece.type === "bishop" || piece.type === "queen") {
          // Diagonal
          directions.push([-1, -1], [-1, 1], [1, -1], [1, 1])
        }

        for (const [rowDir, colDir] of directions) {
          let newRow = row + rowDir
          let newCol = col + colDir

          while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetIndex = coordsToIndex(newRow, newCol)
            const targetPiece = board[targetIndex]

            if (!targetPiece) {
              // Empty square, can move here
              moves.push({ from: i, to: targetIndex, piece })
            } else {
              // Square has a piece
              if (targetPiece.color !== piece.color) {
                // Can capture opponent's piece
                moves.push({
                  from: i,
                  to: targetIndex,
                  piece,
                  capturedPiece: targetPiece,
                })
              }
              // Stop in this direction after hitting any piece
              break
            }

            newRow += rowDir
            newCol += colDir
          }
        }
        break
    }
  }

  return moves
}

// Check if king is in check
export function isKingInCheck(board: (ChessPiece | null)[], turn: PieceColor): boolean {
  // Find the king
  let kingIndex = -1
  for (let i = 0; i < 64; i++) {
    const piece = board[i]
    if (piece && piece.type === "king" && piece.color === turn) {
      kingIndex = i
      break
    }
  }

  if (kingIndex === -1) return false // No king found

  // Get opponent's moves
  const opponentColor: PieceColor = turn === "white" ? "black" : "white"
  const opponentMoves = getLegalMoves(board, opponentColor)

  // Check if any move can capture the king
  return opponentMoves.some((move) => move.to === kingIndex)
}
