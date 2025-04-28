import React from "react"

type ChessPieceRendererProps = {
  type: string
  color: "w" | "b"
}

const ChessPieceRenderer: React.FC<ChessPieceRendererProps> = ({ type, color }) => {
  const typemap: Record<string, string> = {
    "p": "pawn",
    "r": "rook",
    "n": "knight",
    "b": "bishop",
    "q": "queen",
    "k": "king",
  }
  const pieceFileName = `${typemap[type]}-${color}.svg`
  
  const piecePath = `/pieces/${pieceFileName}`
  

  return <img src={piecePath} alt={`${type} ${color}`} className="w-full h-full" />
}

export default ChessPieceRenderer;