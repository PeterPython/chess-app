import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm";

const OPENINGS = [
  {
    id: "ruy-lopez",
    name: "Ruy Lopez",
    eco: "C60",
    description: "Classical pressure on Black's center with long-term kingside safety.",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7"],
  },
  {
    id: "italian-game",
    name: "Italian Game",
    eco: "C50",
    description: "Fast development and tactical pressure against f7 and the center.",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d3", "d6"],
  },
  {
    id: "sicilian-defense",
    name: "Sicilian Defense",
    eco: "B50",
    description: "Dynamic imbalance from move one; central breaks and active piece play.",
    moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
  },
  {
    id: "queens-gambit",
    name: "Queen's Gambit Declined",
    eco: "D30",
    description: "Solid pawn structure, principled development, and long strategic games.",
    moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3", "O-O"],
  },
  {
    id: "french-defense",
    name: "French Defense",
    eco: "C11",
    description: "Counterattacking defense with locked center plans and timely pawn breaks.",
    moves: ["e4", "e6", "d4", "d5", "Nc3", "Nf6", "e5", "Nfd7", "f4", "c5"],
  },
];

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const PIECE_VALUES = { p: 1, n: 3, b: 3.25, r: 5, q: 9, k: 100 };
const CENTER = new Set(["d4", "e4", "d5", "e5", "c4", "f4", "c5", "f5"]);
const PIECE_GLYPHS = {
  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚",
};

const boardEl = document.getElementById("board");
const rankLabelsEl = document.getElementById("rankLabels");
const fileLabelsEl = document.getElementById("fileLabels");
const sideSelect = document.getElementById("sideSelect");
const openingSelect = document.getElementById("openingSelect");
const resetBtn = document.getElementById("resetBtn");
const hintBtn = document.getElementById("hintBtn");
const lessonStatusEl = document.getElementById("lessonStatus");
const gameStatusEl = document.getElementById("gameStatus");
const openingNameEl = document.getElementById("openingName");
const openingDescriptionEl = document.getElementById("openingDescription");
const openingLineEl = document.getElementById("openingLine");
const moveLogEl = document.getElementById("moveLog");
const progressBarEl = document.getElementById("progressBar");
const progressTextEl = document.getElementById("progressText");

let game = new Chess();
let playerSide = "w";
let selectedSquare = null;
let legalTargets = [];
let openingState = { pointer: 0, inBook: true };
let lessonMessage = "";
let lessonMessageTone = "";
let opponentTimer = null;

bootstrap();

function bootstrap() {
  populateOpeningChoices();
  openingSelect.value = OPENINGS[0].id;
  resetLesson(false);

  sideSelect.addEventListener("change", () => resetLesson(true));
  openingSelect.addEventListener("change", () => resetLesson(true));
  resetBtn.addEventListener("click", () => resetLesson(true));
  hintBtn.addEventListener("click", onHintClick);
}

function populateOpeningChoices() {
  openingSelect.innerHTML = "";

  for (const opening of OPENINGS) {
    const option = document.createElement("option");
    option.value = opening.id;
    option.textContent = `${opening.name} (${opening.eco})`;
    openingSelect.appendChild(option);
  }
}

function currentOpening() {
  return OPENINGS.find((opening) => opening.id === openingSelect.value) ?? OPENINGS[0];
}

function resetLesson(showMessage) {
  if (opponentTimer) {
    clearTimeout(opponentTimer);
    opponentTimer = null;
  }

  game = new Chess();
  playerSide = sideSelect.value;
  selectedSquare = null;
  legalTargets = [];
  openingState = { pointer: 0, inBook: true };

  if (showMessage) {
    const sideLabel = playerSide === "w" ? "White" : "Black";
    setLessonMessage(`New lesson started. You are ${sideLabel}.`, "");
  } else {
    setLessonMessage("Ready. Follow the main line and watch for opening guidance.", "");
  }

  renderAll();
  scheduleOpponentMove();
}

function onHintClick() {
  if (game.isGameOver()) {
    setLessonMessage("Game over. Start a new lesson to continue training.", "");
    renderStatus();
    return;
  }

  if (game.turn() !== playerSide) {
    setLessonMessage("Wait for your turn before requesting a hint.", "");
    renderStatus();
    return;
  }

  const expected = getExpectedMoveForCurrentTurn();
  if (openingState.inBook && expected) {
    setLessonMessage(`Opening hint: ${expected} is the main-line move.`, "good");
    renderStatus();
    return;
  }

  const genericHint = chooseHeuristicMove();
  if (!genericHint) {
    setLessonMessage("No legal moves available.", "");
    renderStatus();
    return;
  }

  setLessonMessage(`Out-of-book hint: consider ${genericHint.san}.`, "");
  renderStatus();
}

function scheduleOpponentMove() {
  if (opponentTimer) {
    clearTimeout(opponentTimer);
    opponentTimer = null;
  }

  if (game.isGameOver() || game.turn() === playerSide) {
    return;
  }

  opponentTimer = window.setTimeout(() => {
    playOpponentMove();
    renderAll();
    scheduleOpponentMove();
  }, 450);
}

function playOpponentMove() {
  if (game.isGameOver() || game.turn() === playerSide) {
    return;
  }

  let executedMove = null;

  if (openingState.inBook) {
    const expected = getExpectedMoveForCurrentTurn();
    if (expected) {
      executedMove = game.move(expected);
      if (executedMove) {
        openingState.pointer += 1;

        if (openingState.pointer >= currentOpening().moves.length) {
          openingState.inBook = false;
          setLessonMessage(
            `Main line complete through ${executedMove.san}. Continue into the middlegame.`,
            "good",
          );
        }
      } else {
        openingState.inBook = false;
      }
    } else {
      openingState.inBook = false;
    }
  }

  if (!executedMove) {
    const fallbackMove = chooseHeuristicMove();
    if (!fallbackMove) {
      return;
    }

    executedMove = game.move({
      from: fallbackMove.from,
      to: fallbackMove.to,
      promotion: fallbackMove.promotion ?? "q",
    });

    if (executedMove && !game.isGameOver()) {
      setLessonMessage(`Opponent played ${executedMove.san}.`, "");
    }
  }
}

function handleSquareClick(square) {
  if (game.isGameOver() || game.turn() !== playerSide) {
    return;
  }

  const piece = game.get(square);

  if (!selectedSquare) {
    if (piece && piece.color === playerSide) {
      selectSquare(square);
      renderBoard();
    }
    return;
  }

  if (selectedSquare === square) {
    clearSelection();
    renderBoard();
    return;
  }

  const isTarget = legalTargets.some((move) => move.to === square);
  if (isTarget) {
    const expectedMove = getExpectedMoveForCurrentTurn();
    const move = game.move({ from: selectedSquare, to: square, promotion: "q" });
    if (!move) {
      clearSelection();
      renderBoard();
      return;
    }

    clearSelection();
    evaluatePlayerMove(move, expectedMove);
    renderAll();
    scheduleOpponentMove();
    return;
  }

  if (piece && piece.color === playerSide) {
    selectSquare(square);
    renderBoard();
    return;
  }

  clearSelection();
  renderBoard();
}

function selectSquare(square) {
  selectedSquare = square;
  legalTargets = game.moves({ square, verbose: true });
}

function clearSelection() {
  selectedSquare = null;
  legalTargets = [];
}

function evaluatePlayerMove(move, expectedMove) {
  if (!openingState.inBook || !expectedMove) {
    if (!game.isGameOver()) {
      setLessonMessage(`You played ${move.san}.`, "");
    }
    return;
  }

  if (normalizeSan(move.san) === normalizeSan(expectedMove)) {
    openingState.pointer += 1;

    if (openingState.pointer >= currentOpening().moves.length) {
      openingState.inBook = false;
      setLessonMessage(`Excellent. ${move.san} finishes the main opening line.`, "good");
    } else {
      setLessonMessage(`Good opening move: ${move.san}.`, "good");
    }
    return;
  }

  openingState.inBook = false;
  setLessonMessage(
    `Suboptimal for this opening: you played ${move.san}. Better was ${expectedMove}.`,
    "bad",
  );
}

function getExpectedMoveForCurrentTurn() {
  const opening = currentOpening();
  if (!openingState.inBook || openingState.pointer >= opening.moves.length) {
    return null;
  }

  const expectedColor = openingState.pointer % 2 === 0 ? "w" : "b";
  if (expectedColor !== game.turn()) {
    return null;
  }

  return opening.moves[openingState.pointer];
}

function normalizeSan(san) {
  return san.replace(/[+#?!]/g, "");
}

function chooseHeuristicMove() {
  const moves = game.moves({ verbose: true });
  if (!moves.length) {
    return null;
  }

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    let score = Math.random() * 0.25;

    if (move.captured) {
      score += PIECE_VALUES[move.captured] * 3.6;
      score -= PIECE_VALUES[move.piece] * 0.6;
    }

    if (move.promotion) {
      score += PIECE_VALUES[move.promotion] * 1.7;
    }

    if (move.san.includes("+")) {
      score += 1.3;
    }

    if (move.flags.includes("k") || move.flags.includes("q")) {
      score += 1.7;
    }

    if (CENTER.has(move.to)) {
      score += 0.5;
    }

    if (move.piece === "p" && (move.to.endsWith("4") || move.to.endsWith("5"))) {
      score += 0.35;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function renderAll() {
  renderBoard();
  renderOpeningInfo();
  renderMoveLog();
  renderStatus();
}

function renderBoard() {
  boardEl.innerHTML = "";
  const files = playerSide === "w" ? FILES : [...FILES].reverse();
  const ranks = playerSide === "w" ? [...RANKS].reverse() : RANKS;
  renderCoordinates(files, ranks);

  for (const rank of ranks) {
    for (const file of files) {
      const square = `${file}${rank}`;
      const piece = game.get(square);
      const fileIndex = FILES.indexOf(file);
      const rankIndex = Number(rank) - 1;
      const isLight = (fileIndex + rankIndex) % 2 === 1;
      const isTarget = legalTargets.some((move) => move.to === square);

      const button = document.createElement("button");
      button.type = "button";
      button.className = `square ${isLight ? "light" : "dark"}${selectedSquare === square ? " selected" : ""}${
        isTarget ? " target" : ""
      }`;
      button.setAttribute("aria-label", square);

      if (piece) {
        button.textContent = PIECE_GLYPHS[`${piece.color}${piece.type}`];
      }

      button.addEventListener("click", () => handleSquareClick(square));
      boardEl.appendChild(button);
    }
  }
}

function renderCoordinates(files, ranks) {
  rankLabelsEl.innerHTML = "";
  fileLabelsEl.innerHTML = "";

  for (const rank of ranks) {
    const rankLabel = document.createElement("span");
    rankLabel.className = "coord-label";
    rankLabel.textContent = rank;
    rankLabelsEl.appendChild(rankLabel);
  }

  for (const file of files) {
    const fileLabel = document.createElement("span");
    fileLabel.className = "coord-label";
    fileLabel.textContent = file;
    fileLabelsEl.appendChild(fileLabel);
  }
}

function renderOpeningInfo() {
  const opening = currentOpening();
  openingNameEl.textContent = `${opening.name} (${opening.eco})`;
  openingDescriptionEl.textContent = opening.description;

  const completed = openingState.pointer;
  const total = opening.moves.length;
  const ratio = Math.min(1, completed / total);
  progressBarEl.style.width = `${Math.round(ratio * 100)}%`;

  if (openingState.inBook) {
    const nextMove = getExpectedMoveForCurrentTurn();
    if (nextMove && game.turn() === playerSide) {
      progressTextEl.textContent = `Book progress: ${completed}/${total} plies. Your target move: ${nextMove}.`;
    } else if (nextMove) {
      progressTextEl.textContent = `Book progress: ${completed}/${total} plies. Waiting for opponent response.`;
    } else {
      progressTextEl.textContent = `Book progress: ${completed}/${total} plies.`;
    }
  } else if (completed >= total) {
    progressTextEl.textContent = "Main line completed. Continue practicing middlegame plans.";
  } else {
    progressTextEl.textContent = `You left the main line at ply ${completed + 1}. Keep playing to finish the game.`;
  }

  openingLineEl.innerHTML = "";
  for (let i = 0; i < opening.moves.length; i += 2) {
    const li = document.createElement("li");
    li.className = "line-row";

    const moveNum = document.createElement("span");
    moveNum.className = "move-num";
    moveNum.textContent = `${Math.floor(i / 2) + 1}.`;

    const whiteMove = document.createElement("span");
    const blackMove = document.createElement("span");
    whiteMove.textContent = opening.moves[i] ?? "";
    blackMove.textContent = opening.moves[i + 1] ?? "";

    if (openingState.inBook && openingState.pointer === i) {
      whiteMove.classList.add("next");
    }
    if (openingState.inBook && openingState.pointer === i + 1) {
      blackMove.classList.add("next");
    }

    li.append(moveNum, whiteMove, blackMove);
    openingLineEl.appendChild(li);
  }
}

function renderMoveLog() {
  const history = game.history();
  moveLogEl.innerHTML = "";

  if (!history.length) {
    const li = document.createElement("li");
    li.className = "line-row";
    li.textContent = "No moves yet.";
    moveLogEl.appendChild(li);
    return;
  }

  for (let i = 0; i < history.length; i += 2) {
    const li = document.createElement("li");
    li.className = "line-row";

    const moveNum = document.createElement("span");
    moveNum.className = "move-num";
    moveNum.textContent = `${Math.floor(i / 2) + 1}.`;

    const whiteMove = document.createElement("span");
    whiteMove.textContent = history[i] ?? "";

    const blackMove = document.createElement("span");
    blackMove.textContent = history[i + 1] ?? "";

    li.append(moveNum, whiteMove, blackMove);
    moveLogEl.appendChild(li);
  }
}

function renderStatus() {
  lessonStatusEl.textContent = lessonMessage;
  lessonStatusEl.className = `status${lessonMessageTone ? ` ${lessonMessageTone}` : ""}`;

  let gameStatus = "";
  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "Black" : "White";
    gameStatus = `${winner} wins by checkmate.`;
  } else if (game.isDraw()) {
    if (game.isStalemate()) {
      gameStatus = "Draw by stalemate.";
    } else if (game.isThreefoldRepetition()) {
      gameStatus = "Draw by repetition.";
    } else if (game.isInsufficientMaterial()) {
      gameStatus = "Draw by insufficient material.";
    } else {
      gameStatus = "Draw.";
    }
  } else {
    const side = game.turn() === "w" ? "White" : "Black";
    gameStatus = `${side} to move${game.isCheck() ? " (check)." : "."}`;
  }

  gameStatusEl.textContent = gameStatus;
  hintBtn.disabled = game.turn() !== playerSide || game.isGameOver();
}

function setLessonMessage(message, tone) {
  lessonMessage = message;
  lessonMessageTone = tone;
}
