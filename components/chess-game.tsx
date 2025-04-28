"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  initializeBitboard,
  boardToString,
  stringToBoard,
  getPieceAtIndex,
  makeMove,
  getLegalMoves,
  isKingInCheck,
  squareToAlgebraic,
  type ChessPiece,
  type ChessMove,
} from "@/lib/chess-bitboard"

// Chess pieces using Unicode characters
const PIECES = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
}

// Move History Component
const MoveHistory = ({ history }: { history: ChessMove[] }) => {
  // Format move in a readable way
  const formatMove = (move: ChessMove, index: number) => {
    const from = squareToAlgebraic(move.from)
    const to = squareToAlgebraic(move.to)
    const pieceSymbol = move.piece.type === "pawn" ? "" : move.piece.type[0].toUpperCase()

    return `${Math.floor(index / 2) + 1}${index % 2 === 0 ? "." : "..."} ${pieceSymbol}${from}-${to}`
  }

  return (
    <div className="bg-white p-4 rounded shadow-md h-full">
      <h3 className="text-lg font-bold mb-2">Move History</h3>
      {history.length === 0 ? (
        <p className="text-gray-500">No moves yet</p>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {history.map((move, index) => (
            <div key={index} className="text-sm">
              {formatMove(move, index)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Captured Pieces Component
const CapturedPieces = ({ capturedPieces }: { capturedPieces: { white: ChessPiece[]; black: ChessPiece[] } }) => {
  return (
    <div className="mb-4 flex justify-between">
      <div>
        <h4 className="text-sm font-bold mb-1">White Captures:</h4>
        <div className="flex text-2xl">
          {capturedPieces.white.map((piece, index) => (
            <span key={index}>{PIECES[piece.color][piece.type]}</span>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-bold mb-1">Black Captures:</h4>
        <div className="flex text-2xl">
          {capturedPieces.black.map((piece, index) => (
            <span key={index}>{PIECES[piece.color][piece.type]}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Game Status Component
const GameStatus = ({
  currentTurn,
  status,
}: { currentTurn: "white" | "black"; status: "active" | "check" | "checkmate" | "stalemate" }) => {
  const statusMessages = {
    active: `${currentTurn === "white" ? "White" : "Black"}'s turn`,
    check: `${currentTurn === "white" ? "White" : "Black"} is in check!`,
    checkmate: `Checkmate! ${currentTurn === "white" ? "Black" : "White"} wins!`,
    stalemate: "Stalemate! Game is a draw.",
  }

  const statusClass = status === "check" ? "text-red-600" : status === "checkmate" ? "text-red-700 font-bold" : ""

  return <div className={`text-lg mb-4 ${statusClass}`}>{statusMessages[status]}</div>
}

// Main Chess Game Component
export default function ChessGame() {
  const [board, setBoard] = useState<(ChessPiece | null)[]>(() => initializeBitboard())
  const [boardString, setBoardString] = useState<string>(() => boardToString(initializeBitboard()))
  const [currentTurn, setCurrentTurn] = useState<"white" | "black">("white")
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null)
  const [validMoves, setValidMoves] = useState<number[]>([])
  const [moveHistory, setMoveHistory] = useState<ChessMove[]>([])
  const [gameStatus, setGameStatus] = useState<"active" | "check" | "checkmate" | "stalemate">("active")
  const [capturedPieces, setCapturedPieces] = useState<{ white: ChessPiece[]; black: ChessPiece[] }>({
    white: [],
    black: [],
  })

  // Update board string when board changes
  useEffect(() => {
    setBoardString(boardToString(board))
  }, [board])

  // Update board when board string changes (for manual input)
  const handleBoardStringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all whitespace from the input
    const cleanedInput = e.target.value.replace(/\s+/g, "")
    setBoardString(cleanedInput)

    if (cleanedInput.length === 64) {
      setBoard(stringToBoard(cleanedInput))
      // Reset game state when board is manually changed
      setSelectedSquare(null)
      setValidMoves([])
      setMoveHistory([])
      setGameStatus("active")
      setCapturedPieces({ white: [], black: [] })
      setCurrentTurn("white")
    }
  }

  // Check for checkmate or stalemate
  const checkGameStatus = (newBoard: (ChessPiece | null)[], turn: "white" | "black") => {
    const inCheck = isKingInCheck(newBoard, turn)
    const legalMoves = getLegalMoves(newBoard, turn)

    if (legalMoves.length === 0) {
      if (inCheck) {
        return "checkmate"
      } else {
        return "stalemate"
      }
    } else if (inCheck) {
      return "check"
    } else {
      return "active"
    }
  }

  // Get valid moves for a selected square
  const getValidMovesForSquare = (index: number) => {
    const piece = getPieceAtIndex(board, index)

    if (!piece || piece.color !== currentTurn) {
      return []
    }

    // Get all legal moves for the current player
    const legalMoves = getLegalMoves(board, currentTurn)

    // Filter for moves from the selected square
    return legalMoves.filter((move) => move.from === index).map((move) => move.to)
  }

  // Handle square click
  const handleSquareClick = (index: number) => {
    const piece = getPieceAtIndex(board, index)

    // If a square is already selected
    if (selectedSquare !== null) {
      // Check if the clicked square is a valid move
      if (validMoves.includes(index)) {
        // Make the move
        const fromIndex = selectedSquare
        const toIndex = index
        const capturedPiece = getPieceAtIndex(board, toIndex)

        // Update captured pieces
        if (capturedPiece) {
          const newCapturedPieces = { ...capturedPieces }
          newCapturedPieces[currentTurn].push(capturedPiece)
          setCapturedPieces(newCapturedPieces)
        }

        // Record the move
        const movingPiece = getPieceAtIndex(board, fromIndex)
        if (movingPiece) {
          const newMoveHistory = [
            ...moveHistory,
            {
              piece: movingPiece,
              from: fromIndex,
              to: toIndex,
              capturedPiece: capturedPiece || undefined,
            },
          ]
          setMoveHistory(newMoveHistory)
        }

        // Make the move
        const newBoard = makeMove(board, fromIndex, toIndex)
        setBoard(newBoard)

        // Switch turns
        const nextTurn = currentTurn === "white" ? "black" : "white"
        setCurrentTurn(nextTurn)

        // Check game status
        const newStatus = checkGameStatus(newBoard, nextTurn) as "active" | "check" | "checkmate" | "stalemate"
        setGameStatus(newStatus)

        // Clear selection
        setSelectedSquare(null)
        setValidMoves([])
      } else if (piece && piece.color === currentTurn) {
        // Select a new piece
        setSelectedSquare(index)
        setValidMoves(getValidMovesForSquare(index))
      } else {
        // Clear selection
        setSelectedSquare(null)
        setValidMoves([])
      }
    } else if (piece && piece.color === currentTurn) {
      // Select a piece
      setSelectedSquare(index)
      setValidMoves(getValidMovesForSquare(index))
    }
  }

  const resetGame = () => {
    const initialBoard = initializeBitboard()
    setBoard(initialBoard)
    setBoardString(boardToString(initialBoard))
    setCurrentTurn("white")
    setSelectedSquare(null)
    setValidMoves([])
    setMoveHistory([])
    setGameStatus("active")
    setCapturedPieces({ white: [], black: [] })
  }

  // Chess coordinates
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"]
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="boardState" className="text-sm font-medium">
          Board State (64 characters)
        </label>
        <input
          id="boardState"
          type="text"
          value={boardString}
          onChange={handleBoardStringChange}
          className={`p-2 border rounded-md ${boardString.length !== 64 ? "border-red-500" : "border-gray-300"}`}
          placeholder="Enter 64-character board state"
        />
        {boardString.length !== 64 && <p className="text-red-500 text-sm">Board state must be exactly 64 characters</p>}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-grow">
          <GameStatus currentTurn={currentTurn} status={gameStatus} />
          <CapturedPieces capturedPieces={capturedPieces} />

          <div className="border border-gray-300 rounded-md overflow-hidden">
            <div className="grid grid-cols-9 w-full">
              {/* Empty corner cell */}
              <div className="bg-gray-200 flex items-center justify-center"></div>

              {/* File labels (a-h) */}
              {files.map((file) => (
                <div key={file} className="bg-gray-200 flex items-center justify-center p-1 text-sm">
                  {file}
                </div>
              ))}

              {/* Board with rank labels */}
              {ranks.map((rank, rankIndex) => (
                <>
                  {/* Rank label */}
                  <div key={`rank-${rank}`} className="bg-gray-200 flex items-center justify-center p-1 text-sm">
                    {rank}
                  </div>

                  {/* Board squares for this rank */}
                  {Array.from({ length: 8 }).map((_, fileIndex) => {
                    const index = rankIndex * 8 + fileIndex
                    const isBlackSquare = (rankIndex + fileIndex) % 2 === 1
                    const piece = board[index]
                    const isSelected = selectedSquare === index
                    const isValidMove = validMoves.includes(index)

                    return (
                      <div
                        key={`${rankIndex}-${fileIndex}`}
                        onClick={() => handleSquareClick(index)}
                        className={`
                          aspect-square flex items-center justify-center cursor-pointer
                          ${isBlackSquare ? "bg-gray-600" : "bg-amber-100"}
                          ${isSelected ? "ring-4 ring-blue-500" : ""}
                          ${isValidMove ? "bg-green-300" : ""}
                          hover:opacity-80
                        `}
                      >
                        {piece && (
                          <div className={`text-3xl ${piece.color === "white" ? "text-white" : "text-black"}`}>
                            {PIECES[piece.color][piece.type]}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>
          </div>

          {(gameStatus === "checkmate" || gameStatus === "stalemate") && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={resetGame}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700"
              >
                New Game
              </button>
            </div>
          )}
        </div>

        <div className="w-full md:w-64">
          <MoveHistory history={moveHistory} />
        </div>
      </div>
    </div>
  )
}
