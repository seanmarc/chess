"use client"

import { useState, useEffect } from "react"
import { Chess, Square } from "chess.js"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import Chessboard from "@/components/chessboard"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import useChessEngine from "@/hooks/use-chess-engine"

export default function ChessGame() {
  const [chess, setChess] = useState<Chess>(() => new Chess())
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [gameStatus, setGameStatus] = useState<string>(() => `${chess.turn() === "w" ? "White" : "Black"} to move.`)
  const [possibleMoves, setPossibleMoves] = useState<string[]>([])
  const [isCheckmateModalOpen, setIsCheckmateModalOpen] = useState<boolean>(false)
  const [isDrawModalOpen, setIsDrawModalOpen] = useState<boolean>(false)
  const [isCheckModalOpen, setIsCheckModalOpen] = useState<boolean>(false)
  const [whiteTime, setWhiteTime] = useState<number>(60)
  const [blackTime, setBlackTime] = useState<number>(60)
  const [activePlayer, setActivePlayer] = useState<string>("w")
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState<boolean>(false)
  const [winner, setWinner] = useState<string | null>(null)

  const { getEngineMove, updatePosition, status, lastMove, isLoading} = useChessEngine()

  useEffect(() => {
    updatePosition(chess.fen())
  }, [chess, updatePosition])

  useEffect(() => {
    const timer = setInterval(() => {
      if (chess.turn() === "w") {
        setWhiteTime(prev => Math.max(prev - 1, 0))
      } else {
        setBlackTime(prev => Math.max(prev - 1, 0))
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [chess.turn()])

  useEffect(() => {
    if (whiteTime === 0 || blackTime === 0) {
      const winningPlayer = whiteTime === 0 ? "Black" : "White"
      setGameStatus(`${winningPlayer} wins on time!`)
      setWinner(winningPlayer)
      setIsVictoryModalOpen(true)
    }
  }, [whiteTime, blackTime])

  if (!chess) return <div>Loading...</div>

  const handleSquareClick = (square: string) => {
    // If no square is selected, select this square if it has a piece
    if (!selectedSquare) {
      const piece = chess.get(square as Square)
      if (piece && piece.color === (chess.turn() === "w" ? "w" : "b")) {
        setSelectedSquare(square)
        // Calculate possible moves for the selected piece
        const moves = chess.moves({ square: square as Square, verbose: true }).map(move => move.to)
        setPossibleMoves(moves)
      }
      return
    }

    // If the same square is clicked, deselect it
    if (selectedSquare === square) {
      setSelectedSquare(null)
      setPossibleMoves([]) // Clear possible moves
      return
    }

    // Try to make a move
    try {
      const move = chess.move({
        from: selectedSquare,
        to: square,
        promotion: "q", // Always promote to queen for simplicity
      })

      if (move) {
        // Update game status
        if (chess.isCheckmate()) {
          setIsCheckmateModalOpen(true)
          setGameStatus(`Checkmate! ${chess.turn() === "w" ? "Black" : "White"} wins!`)
        } else if (chess.isDraw()) {
          setIsDrawModalOpen(true)
          setGameStatus("Draw!")
        } else if (chess.isCheck()) {
          setIsCheckModalOpen(true)
          setGameStatus(`Check! ${chess.turn() === "w" ? "White" : "Black"} to move.`)
        } else {
          setGameStatus(`${chess.turn() === "w" ? "White" : "Black"} to move.`)
        }

        // Reset selected square and possible moves
        setSelectedSquare(null)
        setPossibleMoves([])

        // Force a re-render
        setChess(new Chess(chess.fen()))
        updatePosition(chess.fen())

        // Trigger engine move
        getEngineMove(chess.fen()).then(engineMove => {
          if (engineMove) {
            chess.move(engineMove)
            setChess(new Chess(chess.fen()))
            updatePosition(chess.fen())

            // Update game status after AI move
            if (chess.isCheckmate()) {
              setIsCheckmateModalOpen(true)
              setGameStatus(`Checkmate! ${chess.turn() === "w" ? "Black" : "White"} wins!`)
            } else if (chess.isDraw()) {
              setIsDrawModalOpen(true)
              setGameStatus("Draw!")
            } else if (chess.isCheck()) {
              setIsCheckModalOpen(true)
              setGameStatus(`Check! ${chess.turn() === "w" ? "White" : "Black"} to move.`)
            } else {
              setGameStatus(`${chess.turn() === "w" ? "White" : "Black"} to move.`)
            }
          }
        })

        setActivePlayer(chess.turn())
      }
    } catch (e) {
      // If the move is invalid, check if the clicked square has a piece of the current player
      const piece = chess.get(square as Square)
      if (piece && piece.color === (chess.turn() === "w" ? "w" : "b")) {
        setSelectedSquare(square)
      } else {
        setSelectedSquare(null)
      }
    }
  }

  const resetGame = () => {
    const newChess = new Chess()
    setChess(newChess)
    setSelectedSquare(null)
    setGameStatus(`${newChess.turn() === "w" ? "White" : "Black"} to move.`)
    setWhiteTime(60)
    setBlackTime(60)
    setActivePlayer("w")
    setIsVictoryModalOpen(false)
    setWinner(null)
  }



  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
      {isLoading && <div className="fixed inset-0 top-8 left-8 flex items-center justify-center bg-gray-900 bg-opacity-50">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>}
      <h1 className="mb-6 text-3xl font-bold">Chess Bot Made by Sean Marcus</h1>
      <h2 className="mb-6 text-xl font-bold">Current Game Status: {gameStatus}</h2>
      <div className="flex justify-between w-full max-w-md mb-4">
        <div className="text-white">White: {whiteTime}s</div>
        <div className="text-white">Black: {blackTime}s</div>
      </div>
      <div className="p-6 !bg-white rounded-lg shadow-lg">
        <Chessboard 
          position={chess.fen()} 
          selectedSquare={selectedSquare} 
          onSquareClick={handleSquareClick} 
          possibleMoves={possibleMoves}
        />
        <CheckmateModal isOpen={isCheckmateModalOpen} onOpenChange={setIsCheckmateModalOpen} gameStatus={gameStatus} />
        <DrawModal isOpen={isDrawModalOpen} onOpenChange={setIsDrawModalOpen} gameStatus={gameStatus} />
        <VictoryModal isOpen={isVictoryModalOpen} onClose={() => {
          resetGame()
          setIsVictoryModalOpen(false)
        }} winner={winner} />

        <div className="flex items-center justify-between mt-4">
          <div className="text-lg font-medium">
            {gameStatus || `${chess.turn() === "w" ? "White" : "Black"} to move.`}
          </div>
          <div>Hey William</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetGame}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const CheckmateModal = ({ isOpen, onOpenChange, gameStatus }: { isOpen: boolean, onOpenChange: (open: boolean) => void, gameStatus: string }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Checkmate</DialogTitle>
          <DialogDescription>{gameStatus}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

const DrawModal = ({ isOpen, onOpenChange, gameStatus }: { isOpen: boolean, onOpenChange: (open: boolean) => void, gameStatus: string } ) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
     
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Draw</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

const VictoryModal = ({ isOpen, winner, onClose }: { isOpen: boolean, winner: string | null, onClose: () => void }) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Victory</DialogTitle>
          <DialogDescription>{winner === "White" ? "You win champion!" : "You lost! Try again next time!"}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full"onClick={onClose}>Restart Game Game</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
