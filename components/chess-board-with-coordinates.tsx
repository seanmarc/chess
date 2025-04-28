"use client"

import type React from "react"

import { useState } from "react"

interface ChessBoardWithCoordinatesProps {
  boardState: string
}

const ChessBoardWithCoordinates = ({ boardState }: ChessBoardWithCoordinatesProps) => {
  const [currentBoardState, setCurrentBoardState] = useState(boardState)

  // Map piece codes to Unicode chess symbols
  const pieceMap: Record<string, string> = {
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    p: "♟",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
    P: "♙",
    "0": "",
  }

  // Function to handle board state input changes
  const handleBoardStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all whitespace from the input
    const cleanedInput = e.target.value.replace(/\s+/g, "")
    setCurrentBoardState(cleanedInput)
  }

  // Validate if the input is a valid board state (64 characters)
  const isValidBoardState = currentBoardState.length === 64

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
          value={currentBoardState}
          onChange={handleBoardStateChange}
          className={`p-2 border rounded-md ${!isValidBoardState ? "border-red-500" : "border-gray-300"}`}
          placeholder="Enter 64-character board state"
        />
        {!isValidBoardState && <p className="text-red-500 text-sm">Board state must be exactly 64 characters</p>}
      </div>

      {isValidBoardState && (
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
                  const piece = currentBoardState[index]
                  const pieceSymbol = pieceMap[piece]
                  const isPieceWhite = piece !== "0" && piece === piece.toUpperCase()

                  return (
                    <div
                      key={`${rankIndex}-${fileIndex}`}
                      className={`aspect-square flex items-center justify-center ${
                        isBlackSquare ? "bg-gray-600" : "bg-amber-100"
                      }`}
                    >
                      <div className={`text-3xl ${isPieceWhite ? "text-white" : "text-black"}`}>{pieceSymbol}</div>
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm text-gray-600">
        <p className="font-medium">Legend:</p>
        <ul className="list-disc pl-5">
          <li>0 = empty square</li>
          <li>p/P = pawn (lowercase = black, uppercase = white)</li>
          <li>r/R = rook</li>
          <li>n/N = knight</li>
          <li>b/B = bishop</li>
          <li>q/Q = queen</li>
          <li>k/K = king</li>
        </ul>
      </div>
    </div>
  )
}

export default ChessBoardWithCoordinates
