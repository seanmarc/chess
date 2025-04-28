"use client"

import type React from "react"

import { useState, useEffect } from "react"
import ChessPieceRenderer from "./chess-piece-renderer"

interface ChessboardProps {
  position: string
  selectedSquare: string | null
  onSquareClick: (square: string) => void
  possibleMoves: string[]
}

export default function Chessboard({ position, selectedSquare, onSquareClick, possibleMoves }: ChessboardProps) {
  const [boardSize, setBoardSize] = useState(480)
  const [pieces, setPieces] = useState<Record<string, { type: string; color: string }>>({})

  // Parse FEN string to get piece positions
  useEffect(() => {
    const newPieces: Record<string, { type: string; color: string }> = {}
    const fenParts = position.split(" ")
    const rows = fenParts[0].split("/")

    rows.forEach((row, rowIndex) => {
      let colIndex = 0

      for (let i = 0; i < row.length; i++) {
        const char = row[i]

        if (/\d/.test(char)) {
          colIndex += Number.parseInt(char)
        } else {
          const square = String.fromCharCode(97 + colIndex) + (8 - rowIndex)
          const color = char === char.toUpperCase() ? "w" : "b"
          const type = char.toLowerCase()

          newPieces[square] = { type, color }
          colIndex++
        }
      }
    })

    setPieces(newPieces)
  }, [position])

  // Adjust board size based on window size
  useEffect(() => {
    const handleResize = () => {
      const maxSize = Math.min(window.innerWidth - 40, window.innerHeight - 200, 480)
      setBoardSize(maxSize)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Generate the chessboard squares
  const renderSquares = () => {
    const squares = []
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"]
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"]

    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
      for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
        const square = files[fileIndex] + ranks[rankIndex]
        const isLight = (fileIndex + rankIndex) % 2 === 1
        const piece = pieces[square]
        const isSelected = selectedSquare === square
        const isPossibleMove = possibleMoves.includes(square)

        squares.push(
          <div
            key={square}
            className={`
              flex items-center justify-center
              ${isLight ? "bg-amber-100" : "bg-amber-800"} 
              ${isPossibleMove ? "bg-amber-200" : ""}
              ${isSelected ? "ring-4 ring-blue-500 ring-inset" : ""}
              ${isSelected ? "z-10" : ""}
              relative
            `}
            style={{ width: boardSize / 8, height: boardSize / 8 }}
            onClick={() => onSquareClick(square)}
            data-square={square}
          >
            {/* Render piece */}
            {piece && (
              <div className="absolute inset-0 flex items-center justify-center">
                <ChessPieceRenderer type={piece.type} color={piece.color as "w" | "b"} />
              </div>
            )}

            {/* Rank labels (on a-file) */}
            {fileIndex === 0 && (
              <div className="absolute left-1 top-1 text-xs font-bold text-gray-700">{ranks[rankIndex]}</div>
            )}

            {/* File labels (on 1st rank) */}
            {rankIndex === 7 && (
              <div className="absolute right-1 bottom-1 text-xs font-bold text-gray-700">{files[fileIndex]}</div>
            )}
          </div>,
        )
      }
    }

    return squares
  }

  return (
    <div className="grid grid-cols-8 border border-gray-800" style={{ width: boardSize, height: boardSize }}>
      {renderSquares()}
    </div>
  )
}
