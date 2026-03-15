import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm";

const STORAGE_KEY = "opening-coach-v4";
const API_BASE_URL =
  document
    .querySelector('meta[name="opening-coach-api-base-url"]')
    ?.getAttribute("content")
    ?.trim() || "http://localhost:4000";
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_STRENGTH = "3";
const DEFAULT_MODE = "opening";
const OPPONENT_MOVE_ANIMATION_MS = 1000;

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

const PIECE_VALUES = { p: 1, n: 3, b: 3.25, r: 5, q: 9, k: 100 };
const CENTER = new Set(["d4", "e4", "d5", "e5", "c4", "f4", "c5", "f5"]);

const STRENGTH_PROFILES = {
  1: { depth: 1, varietyWindow: 0.45, temperature: 0.76, maxCandidates: 6 },
  2: { depth: 2, varietyWindow: 0.34, temperature: 0.56, maxCandidates: 5 },
  3: { depth: 2, varietyWindow: 0.24, temperature: 0.36, maxCandidates: 4 },
  4: { depth: 3, varietyWindow: 0.16, temperature: 0.22, maxCandidates: 3 },
  5: { depth: 3, varietyWindow: 0.1, temperature: 0.12, maxCandidates: 2 },
};

const STARTING_MINOR_SQUARES = {
  w: { n: new Set(["b1", "g1"]), b: new Set(["c1", "f1"]) },
  b: { n: new Set(["b8", "g8"]), b: new Set(["c8", "f8"]) },
};

const CASTLED_KING_SQUARES = {
  w: new Set(["g1", "c1"]),
  b: new Set(["g8", "c8"]),
};

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

const OPENINGS = [
  {
    id: "ruy-lopez",
    name: "Ruy Lopez",
    eco: "C60",
    description: "Classical pressure on Black's center with long-term kingside safety.",
    keyIdeas: [
      "Pressure e5 with the Bb5 pin and quick development.",
      "Castle early, then choose between c3/d4 central expansion or quieter maneuvering.",
      "Watch for tactical ideas on e5 once the pin is established.",
    ],
    variations: [
      makeVariation(
        "Morphy Defense",
        ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7"],
        {
          0: "Take central space and open lines for your pieces.",
          2: "Develop with immediate pressure on e5.",
          4: "Pinning the knight increases central tension.",
          8: "Castle before the center opens tactically.",
        },
      ),
      makeVariation(
        "Berlin Defense",
        ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6", "O-O", "Nxe4", "d4", "Nd6"],
        {
          5: "Black challenges with the Berlin setup.",
          8: "White strikes the center to punish loose piece play.",
        },
      ),
    ],
  },
  {
    id: "italian-game",
    name: "Italian Game",
    eco: "C50",
    description: "Fast development and pressure on f7 with tactical and strategic options.",
    keyIdeas: [
      "Develop quickly and keep pressure on f7 and the center.",
      "Choose calm buildup (d3/c3) or tactical play in the Two Knights branch.",
      "Coordinate pieces before launching kingside tactics.",
    ],
    variations: [
      makeVariation(
        "Giuoco Piano Setup",
        ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d3", "d6"],
        {
          4: "Bishop to c4 immediately eyes f7.",
          6: "c3 supports d4 and controls the center.",
        },
      ),
      makeVariation(
        "Two Knights",
        ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5", "exd5", "Na5"],
        {
          6: "Ng5 creates immediate tactical pressure on f7.",
          8: "White opens lines to exploit development lead.",
        },
      ),
    ],
  },
  {
    id: "sicilian-defense",
    name: "Sicilian Defense",
    eco: "B50",
    description: "Asymmetric center and dynamic counterplay from move one.",
    keyIdeas: [
      "Use central breaks and active pieces instead of symmetrical structure.",
      "White often aims for fast development; Black seeks queenside and central counterplay.",
      "Piece activity and king safety matter more than pure pawn count.",
    ],
    variations: [
      makeVariation(
        "Najdorf Structure",
        ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"],
        {
          1: "c5 challenges d4 and avoids symmetry.",
          9: "...a6 prepares queenside expansion and ...e5 control.",
        },
      ),
      makeVariation(
        "Dragon Setup",
        ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6"],
        {
          9: "...g6 sets up a fianchetto and long diagonal pressure.",
        },
      ),
    ],
  },
  {
    id: "caro-kann-defense",
    name: "Caro-Kann Defense",
    eco: "B10",
    description: "Solid pawn structure with reliable development and resilient endgames.",
    keyIdeas: [
      "Challenge e4 with c6 and d5 while keeping structure healthy.",
      "Develop the light-squared bishop before locking pawns when possible.",
      "Caro-Kann players often aim for stable middlegames and technical endings.",
    ],
    variations: [
      makeVariation(
        "Classical",
        ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5", "Ng3", "Bg6"],
        {
          1: "...c6 supports ...d5 without early tactical concessions.",
          7: "...Bf5 develops actively before locking in with ...e6.",
        },
      ),
      makeVariation(
        "Advance Variation",
        ["e4", "c6", "d4", "d5", "e5", "Bf5", "Nf3", "e6", "Be2", "c5"],
        {
          4: "White grabs space; Black must undermine the center.",
          9: "...c5 is the thematic break against White's pawn chain.",
        },
      ),
    ],
  },
  {
    id: "scotch-game",
    name: "Scotch Game",
    eco: "C45",
    description: "Open central play where quick activity and tactics matter early.",
    keyIdeas: [
      "White opens the center quickly to gain activity.",
      "Black should develop with tempo and avoid losing central control.",
      "Piece coordination in open positions is critical.",
    ],
    variations: [
      makeVariation(
        "Main Line",
        ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4", "Nf6", "Nxc6", "bxc6"],
        {
          4: "d4 opens the center before Black is fully coordinated.",
          9: "...bxc6 keeps strong central presence at the cost of structure.",
        },
      ),
      makeVariation(
        "Classical with ...Bc5",
        ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4", "Bc5", "Nb3", "Bb6"],
        {
          7: "...Bc5 develops with initiative toward f2.",
          8: "Nb3 preserves the knight and prepares c4 expansion.",
        },
      ),
    ],
  },
  {
    id: "kings-indian-defense",
    name: "King's Indian Defense",
    eco: "E60",
    description: "Hypermodern setup where Black cedes space early and counterattacks later.",
    keyIdeas: [
      "Black allows White center then attacks with ...e5 or ...c5 breaks.",
      "Kingside piece activity and pawn storms are common thematic plans.",
      "White should convert space edge into stable development.",
    ],
    variations: [
      makeVariation(
        "Classical Setup",
        ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "Nf3", "O-O"],
        {
          1: "...Nf6 keeps options flexible against many d4 systems.",
          7: "...d6 supports ...e5 break and dark-square strategy.",
        },
      ),
      makeVariation(
        "Fianchetto Approach",
        ["d4", "Nf6", "c4", "g6", "Nf3", "Bg7", "g3", "O-O", "Bg2", "d6"],
        {
          6: "White chooses a safer kingside setup with g3/Bg2.",
          9: "...d6 keeps central break options alive.",
        },
      ),
    ],
  },
  {
    id: "nimzo-indian-defense",
    name: "Nimzo-Indian Defense",
    eco: "E20",
    description: "A flexible strategic defense built around piece pressure and central control.",
    keyIdeas: [
      "Pinning on c3 can damage White's pawn structure.",
      "Black balances piece pressure with timely ...c5 or ...d5 breaks.",
      "White aims for central control and bishop pair compensation.",
    ],
    variations: [
      makeVariation(
        "Classical",
        ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "e3", "O-O", "Bd3", "d5"],
        {
          5: "...Bb4 creates immediate structural pressure.",
          8: "Bd3 develops and keeps central flexibility.",
        },
      ),
      makeVariation(
        "Rubinstein Setup",
        ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "e3", "c5", "Bd3", "Nc6"],
        {
          7: "...c5 challenges White's center dynamically.",
        },
      ),
    ],
  },
  {
    id: "queens-gambit-declined",
    name: "Queen's Gambit Declined",
    eco: "D30",
    description: "Solid central structure and strategic piece play from both sides.",
    keyIdeas: [
      "Black declines the gambit to keep central durability.",
      "Minor piece placement and pawn breaks decide middlegame plans.",
      "White often seeks space plus pressure on c- and e-files.",
    ],
    variations: [
      makeVariation(
        "Orthodox",
        ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3", "O-O"],
        {
          2: "c4 challenges Black's d5 pawn and asks central questions.",
          3: "...e6 reinforces d5 and prepares ...Nf6.",
        },
      ),
      makeVariation(
        "Exchange Structure",
        ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "cxd5", "exd5", "Bg5", "Be7"],
        {
          6: "Exchange creates a symmetric structure with rich piece play.",
        },
      ),
    ],
  },
  {
    id: "slav-defense",
    name: "Slav Defense",
    eco: "D10",
    description: "Reliable d-pawn defense with active piece development opportunities.",
    keyIdeas: [
      "...c6 supports d5 and often frees the light-squared bishop.",
      "Black can choose solid setups or sharper pawn grabs on c4.",
      "White often fights for central and queenside initiative.",
    ],
    variations: [
      makeVariation(
        "Main Line",
        ["d4", "d5", "c4", "c6", "Nc3", "Nf6", "Nf3", "dxc4", "a4", "Bf5"],
        {
          3: "...c6 keeps d5 defended and structure compact.",
          7: "...dxc4 grabs pawn and challenges White's center.",
        },
      ),
      makeVariation(
        "Semi-Slav Setup",
        ["d4", "d5", "c4", "c6", "Nc3", "Nf6", "Nf3", "e6", "e3", "Nbd7"],
        {
          7: "...e6 heads toward Semi-Slav structures.",
        },
      ),
    ],
  },
  {
    id: "queens-gambit-accepted-nf3",
    name: "Queen's Gambit Accepted (3.Nf3)",
    eco: "D20",
    description: "Black takes c4 and White regains it through smooth development.",
    keyIdeas: [
      "White develops quickly and recovers c4 without overextending.",
      "Black seeks active piece play rather than clinging to extra pawn.",
      "Center timing matters more than immediate material count.",
    ],
    variations: [
      makeVariation(
        "Classical Recovery",
        ["d4", "d5", "c4", "dxc4", "Nf3", "Nf6", "e3", "e6", "Bxc4", "c5"],
        {
          4: "Nf3 supports e5 control and flexible recapture plans.",
          8: "Bxc4 restores material with active bishop placement.",
        },
      ),
      makeVariation(
        "...a6 and ...b5 Plan",
        ["d4", "d5", "c4", "dxc4", "Nf3", "Nf6", "e3", "a6", "Bxc4", "b5"],
        {
          7: "...a6 prepares queenside expansion while keeping activity.",
        },
      ),
    ],
  },
  {
    id: "queens-gambit-accepted-e4",
    name: "Queen's Gambit Accepted (3.e4)",
    eco: "D20",
    description: "White grabs central space quickly, entering sharper tactical structures.",
    keyIdeas: [
      "White builds a big center and accepts tactical complexity.",
      "Black should strike the center early with ...e5 or timely piece pressure.",
      "Accurate development is essential for both sides.",
    ],
    variations: [
      makeVariation(
        "Center Clash",
        ["d4", "d5", "c4", "dxc4", "e4", "e5", "Nf3", "exd4", "Bxc4", "Nc6"],
        {
          4: "e4 builds central mass and accelerates development options.",
          5: "...e5 challenges White's center before it stabilizes.",
        },
      ),
      makeVariation(
        "...Nf6 Move Order",
        ["d4", "d5", "c4", "dxc4", "e4", "Nf6", "Nc3", "e5", "Nf3", "exd4"],
        {
          6: "Nc3 reinforces e4 and supports central flexibility.",
        },
      ),
    ],
  },
  {
    id: "london-system",
    name: "London System",
    eco: "D02",
    description: "A practical setup with stable structure and clear development plans.",
    keyIdeas: [
      "Develop the bishop outside the pawn chain before e3.",
      "Maintain a solid center and avoid unnecessary tactical risks.",
      "Typical plans involve c3, Nbd2, and kingside safety first.",
    ],
    variations: [
      makeVariation(
        "Classical London",
        ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "Bg3", "O-O"],
        {
          4: "Bf4 develops the bishop actively before locking with e3.",
          8: "Bg3 preserves the bishop pair and keeps pressure.",
        },
      ),
      makeVariation(
        "London vs King's Indian Setup",
        ["d4", "Nf6", "Nf3", "g6", "Bf4", "Bg7", "e3", "O-O", "h3", "d6"],
        {
          8: "h3 prevents ...Bg4 pins and supports flexible kingside setup.",
        },
      ),
    ],
  },
  {
    id: "french-defense",
    name: "French Defense",
    eco: "C11",
    description: "Counterattacking defense with resilient structure and central tension.",
    keyIdeas: [
      "Black challenges White's center with ...d5 and later ...c5 breaks.",
      "Space vs structure tradeoff defines many French middlegames.",
      "Piece activity around blocked centers is a core skill here.",
    ],
    variations: [
      makeVariation(
        "Classical",
        ["e4", "e6", "d4", "d5", "Nc3", "Nf6", "e5", "Nfd7", "f4", "c5"],
        {
          1: "...e6 prepares ...d5 with solid pawn support.",
          9: "...c5 is the key lever against White's center.",
        },
      ),
      makeVariation(
        "Tarrasch",
        ["e4", "e6", "d4", "d5", "Nd2", "Nf6", "e5", "Nfd7", "Bd3", "c5"],
        {
          4: "Nd2 avoids some pin lines and keeps central options.",
        },
      ),
    ],
  },
];

const OPENING_BOOK_CACHE = new Map();

const boardEl = document.getElementById("board");
const rankLabelsEl = document.getElementById("rankLabels");
const fileLabelsEl = document.getElementById("fileLabels");

const userSelect = document.getElementById("userSelect");
const loginPasswordInput = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const newUsernameInput = document.getElementById("newUsername");
const newPasswordInput = document.getElementById("newPassword");
const createUserBtn = document.getElementById("createUserBtn");
const accountStatusEl = document.getElementById("accountStatus");
const accountExpandedEl = document.getElementById("accountExpanded");
const accountCompactEl = document.getElementById("accountCompact");
const accountCompactUserEl = document.getElementById("accountCompactUser");

const sideSelect = document.getElementById("sideSelect");
const openingSelect = document.getElementById("openingSelect");
const strengthSelect = document.getElementById("strengthSelect");
const modeSelect = document.getElementById("modeSelect");
const resetBtn = document.getElementById("resetBtn");
const hintBtn = document.getElementById("hintBtn");
const takebackBtn = document.getElementById("takebackBtn");
const spacedStatusEl = document.getElementById("spacedStatus");

const lessonStatusEl = document.getElementById("lessonStatus");
const gameStatusEl = document.getElementById("gameStatus");
const openingNameEl = document.getElementById("openingName");
const openingDescriptionEl = document.getElementById("openingDescription");
const progressBarEl = document.getElementById("progressBar");
const progressTextEl = document.getElementById("progressText");
const coachingTextEl = document.getElementById("coachingText");
const coachingListEl = document.getElementById("coachingList");
const openingLineEl = document.getElementById("openingLine");
const statsSummaryEl = document.getElementById("statsSummary");
const statsListEl = document.getElementById("statsList");
const moveLogEl = document.getElementById("moveLog");

let game = new Chess();
let playerSide = "w";
let selectedSquare = null;
let legalTargets = [];
let lessonMessage = "";
let lessonMessageTone = "";
let accountMessage = "";
let accountMessageTone = "";
let opponentTimer = null;
let isOpponentAnimating = false;
let openingBook = null;
let dataStore = loadStore();
let lessonState = createEmptyLessonState();
let takebackStack = [];

bootstrap();

async function bootstrap() {
  validateOpeningCatalog();
  populateOpeningChoices();
  populateUserSelect();

  openingSelect.value = OPENINGS[0].id;
  strengthSelect.value = DEFAULT_STRENGTH;
  modeSelect.value = DEFAULT_MODE;

  sideSelect.addEventListener("change", () => resetLesson(true));
  openingSelect.addEventListener("change", () => resetLesson(true));
  strengthSelect.addEventListener("change", onStrengthChange);
  modeSelect.addEventListener("change", onModeChange);
  resetBtn.addEventListener("click", () => resetLesson(true));
  hintBtn.addEventListener("click", onHintClick);
  takebackBtn.addEventListener("click", onTakebackClick);

  loginBtn.addEventListener("click", onLogin);
  logoutBtn.addEventListener("click", onLogout);
  createUserBtn.addEventListener("click", onCreateAccount);

  setOpeningSelectorState();
  await restoreSession();
  resetLesson(false);

  window.addEventListener("beforeunload", () => {
    commitLessonSession();
    saveStore();
  });
}

function makeVariation(name, sans, notes = {}) {
  return {
    name,
    moves: sans.map((san, index) => ({ san, note: notes[index] ?? "" })),
  };
}

function createEmptyLessonState() {
  return {
    inBook: true,
    bestPly: 0,
    session: null,
  };
}

function createLessonSession(openingId) {
  const user = activeUser();
  return {
    openingId,
    userId: user?.id ?? null,
    side: playerSide,
    strength: strengthSelect.value,
    mode: modeSelect.value,
    openingAttempts: 0,
    openingCorrect: 0,
    offBook: false,
    completed: false,
    hadMoves: false,
    reviewRecorded: false,
    gameRecorded: false,
  };
}

function onStrengthChange() {
  setLessonMessage(`Opponent strength set to ${strengthSelect.value}. Change applies immediately.`, "");
  renderStatus();
}

function onModeChange() {
  if (modeSelect.value === "spaced" && !activeUser()) {
    modeSelect.value = "opening";
    setAccountMessage("Log in first to use spaced repetition mode.", "bad");
  }

  setOpeningSelectorState();
  resetLesson(true);
}

function setOpeningSelectorState() {
  openingSelect.disabled = modeSelect.value === "spaced";
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

function resolveOpeningForMode() {
  if (modeSelect.value !== "spaced") {
    return currentOpening();
  }

  const user = activeUser();
  if (!user) {
    modeSelect.value = "opening";
    setOpeningSelectorState();
    return currentOpening();
  }

  const openingId = chooseSpacedOpening(user, playerSide);
  openingSelect.value = openingId;
  return currentOpening();
}

function resetLesson(showMessage) {
  commitLessonSession();

  if (opponentTimer) {
    clearTimeout(opponentTimer);
    opponentTimer = null;
  }

  game = new Chess();
  playerSide = sideSelect.value;
  selectedSquare = null;
  legalTargets = [];
  isOpponentAnimating = false;
  takebackStack = [];

  const opening = resolveOpeningForMode();
  openingBook = getOpeningBook(opening);

  lessonState = createEmptyLessonState();
  lessonState.session = createLessonSession(opening.id);

  if (showMessage) {
    const sideLabel = playerSide === "w" ? "White" : "Black";
    setLessonMessage(
      `New lesson started: ${opening.name}. You are ${sideLabel}. Strength ${strengthSelect.value}.`,
      "",
    );
  } else {
    setLessonMessage("Ready. Follow opening principles and use hints when needed.", "");
  }

  renderAll();
  scheduleOpponentMove();
}

function commitLessonSession() {
  const session = lessonState.session;
  if (!session) {
    return;
  }

  const hadActivity = session.hadMoves || session.openingAttempts > 0 || game.history().length > 0;
  if (!hadActivity) {
    lessonState.session = null;
    return;
  }

  recordGameResultIfNeeded();

  const user = getSessionUser(session);
  if (user) {
    const bucket = ensureStatsBucket(user, session.openingId, session.side, session.strength);
    bucket.lessons += 1;
    bucket.openingAttempts += session.openingAttempts;
    bucket.openingCorrect += session.openingCorrect;
    if (session.offBook) {
      bucket.offBookEvents += 1;
    }
    if (session.completed) {
      bucket.completions += 1;
    }
    saveStore();
    void syncProgress();
  }

  lessonState.session = null;
}

function onHintClick() {
  if (game.isGameOver()) {
    setLessonMessage("Game over. Start a new lesson to continue training.", "");
    renderStatus();
    return;
  }

  if (game.turn() !== playerSide) {
    setLessonMessage("Wait for your turn before asking for a hint.", "");
    renderStatus();
    return;
  }

  const bookEntry = currentBookEntry();
  if (lessonState.inBook && bookEntry && bookEntry.options.size > 0) {
    const options = Array.from(bookEntry.options.values())
      .slice(0, 3)
      .map((option) => option.san)
      .join(", ");
    setLessonMessage(`Opening hint: good choices here include ${options}.`, "good");
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

function onTakebackClick() {
  if (isOpponentAnimating || !takebackStack.length) {
    return;
  }

  if (opponentTimer) {
    clearTimeout(opponentTimer);
    opponentTimer = null;
  }

  const snapshot = takebackStack.pop();
  restoreSnapshot(snapshot);
  setLessonMessage("Reverted to the position before your last move.", "");
  renderAll();
  scheduleOpponentMove();
}

function scheduleOpponentMove() {
  if (opponentTimer) {
    clearTimeout(opponentTimer);
    opponentTimer = null;
  }

  if (game.isGameOver() || game.turn() === playerSide || isOpponentAnimating) {
    return;
  }

  opponentTimer = window.setTimeout(async () => {
    await playOpponentMove();
    renderAll();
    scheduleOpponentMove();
  }, 350);
}

async function playOpponentMove() {
  if (game.isGameOver() || game.turn() === playerSide || isOpponentAnimating) {
    return;
  }

  let plannedMove = null;
  let plannedBookOption = null;

  if (lessonState.inBook) {
    const bookEntry = currentBookEntry();
    if (bookEntry && bookEntry.options.size > 0) {
      const chosen = chooseBookOption(bookEntry);
      if (chosen) {
        plannedMove = chosen.move;
        plannedBookOption = chosen.option;
      } else {
        lessonState.inBook = false;
      }
    } else {
      lessonState.inBook = false;
    }
  }

  if (!plannedMove) {
    plannedMove = chooseHeuristicMove();
    if (!plannedMove) {
      return;
    }
  }

  await animateOpponentMove(plannedMove);

  const executedMove = game.move({
    from: plannedMove.from,
    to: plannedMove.to,
    promotion: plannedMove.promotion ?? "q",
  });

  if (!executedMove) {
    return;
  }

  markSessionActive();

  if (plannedBookOption) {
    lessonState.bestPly = Math.max(lessonState.bestPly, plannedBookOption.nextPly);

    if (plannedBookOption.terminal) {
      markOpeningCompleted(executedMove.san);
      return;
    }

    if (!currentBookEntry()) {
      lessonState.inBook = false;
      if (!lessonState.session.completed) {
        setLessonMessage(`Opponent played ${executedMove.san}. You are now outside prepared lines.`, "");
      }
      return;
    }

    if (!game.isGameOver()) {
      setLessonMessage(`Opponent followed book move ${executedMove.san}.`, "");
    }
    return;
  }

  if (!game.isGameOver()) {
    setLessonMessage(`Opponent played ${executedMove.san}.`, "");
  }
}

function chooseBookOption(bookEntry) {
  const legalMoves = game.moves({ verbose: true });
  const candidates = [];

  for (const option of bookEntry.options.values()) {
    const match = legalMoves.find((move) => normalizeSan(move.san) === normalizeSan(option.san));
    if (match) {
      candidates.push({ move: match, option });
    }
  }

  if (!candidates.length) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function animateOpponentMove(move) {
  const movingPiece = game.get(move.from);
  if (!movingPiece) {
    return;
  }

  clearSelection();
  renderBoard();

  const fromCenter = getSquareCenter(move.from);
  const toCenter = getSquareCenter(move.to);
  if (!fromCenter || !toCenter) {
    return;
  }

  const originSquareEl = boardEl.querySelector(`[data-square="${move.from}"]`);
  const movingPieceEl = document.createElement("div");
  movingPieceEl.className = "moving-piece";
  appendPieceGlyph(movingPieceEl, movingPiece);
  movingPieceEl.style.left = `${fromCenter.x}px`;
  movingPieceEl.style.top = `${fromCenter.y}px`;
  movingPieceEl.style.transitionDuration = `${OPPONENT_MOVE_ANIMATION_MS}ms`;

  isOpponentAnimating = true;

  if (originSquareEl) {
    originSquareEl.style.visibility = "hidden";
  }
  boardEl.appendChild(movingPieceEl);

  const deltaX = toCenter.x - fromCenter.x;
  const deltaY = toCenter.y - fromCenter.y;

  await new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      movingPieceEl.style.transform = `translate(-50%, -50%) translate(${deltaX}px, ${deltaY}px)`;
      window.setTimeout(resolve, OPPONENT_MOVE_ANIMATION_MS);
    });
  });

  if (originSquareEl) {
    originSquareEl.style.visibility = "";
  }
  movingPieceEl.remove();
  isOpponentAnimating = false;
}

function getSquareCenter(square) {
  const squareEl = boardEl.querySelector(`[data-square="${square}"]`);
  if (!squareEl) {
    return null;
  }

  const boardRect = boardEl.getBoundingClientRect();
  const squareRect = squareEl.getBoundingClientRect();
  return {
    x: squareRect.left - boardRect.left + squareRect.width / 2,
    y: squareRect.top - boardRect.top + squareRect.height / 2,
  };
}

function handleSquareClick(square) {
  if (isOpponentAnimating || game.isGameOver() || game.turn() !== playerSide) {
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
    pushTakebackSnapshot();
    const bookEntryBeforeMove = currentBookEntry();
    const move = game.move({ from: selectedSquare, to: square, promotion: "q" });
    if (!move) {
      takebackStack.pop();
      clearSelection();
      renderBoard();
      return;
    }

    clearSelection();
    evaluatePlayerMove(move, bookEntryBeforeMove);
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

function evaluatePlayerMove(move, bookEntryBeforeMove) {
  markSessionActive();

  if (!lessonState.inBook) {
    if (!game.isGameOver()) {
      setLessonMessage(`You played ${move.san}.`, "");
    }
    return;
  }

  if (!bookEntryBeforeMove || bookEntryBeforeMove.options.size === 0) {
    lessonState.inBook = false;
    setLessonMessage(`You played ${move.san}. This position is outside prepared repertoire.`, "");
    return;
  }

  const session = lessonState.session;
  if (session) {
    session.openingAttempts += 1;
  }

  const matchedOption = bookEntryBeforeMove.options.get(normalizeSan(move.san));
  if (!matchedOption) {
    lessonState.inBook = false;

    if (session) {
      session.offBook = true;
    }

    const alternatives = Array.from(bookEntryBeforeMove.options.values())
      .slice(0, 3)
      .map((option) => option.san)
      .join(", ");

    const tip = firstSetValue(collectNotesFromEntry(bookEntryBeforeMove));
    setLessonMessage(
      `Suboptimal for this opening: ${move.san}. Better options: ${alternatives}.${tip ? ` ${tip}` : ""}`,
      "bad",
    );

    recordReviewOutcome(false);
    return;
  }

  if (session) {
    session.openingCorrect += 1;
  }

  lessonState.bestPly = Math.max(lessonState.bestPly, matchedOption.nextPly);

  if (matchedOption.terminal) {
    markOpeningCompleted(move.san);
    return;
  }

  const note = firstSetValue(matchedOption.notes);
  setLessonMessage(`Book move: ${move.san}.${note ? ` ${note}` : ""}`, "good");

  if (!currentBookEntry()) {
    lessonState.inBook = false;
    if (!lessonState.session.completed) {
      setLessonMessage(`Book line ended after ${move.san}. Continue playing the game.`, "good");
    }
  }
}

function markOpeningCompleted(lastMoveSan) {
  const session = lessonState.session;
  lessonState.inBook = false;

  if (session && !session.completed) {
    session.completed = true;
    recordReviewOutcome(true);
  }

  setLessonMessage(`Excellent. ${lastMoveSan} completes your selected opening repertoire line.`, "good");
}

function recordReviewOutcome(success) {
  const session = lessonState.session;
  if (!session || session.reviewRecorded) {
    return;
  }

  const user = getSessionUser(session);
  if (!user) {
    session.reviewRecorded = true;
    return;
  }

  const card = ensureRepetitionCard(user, session.openingId, session.side);

  if (success) {
    card.streak += 1;
    if (card.streak === 1) {
      card.intervalDays = 1;
    } else if (card.streak === 2) {
      card.intervalDays = 3;
    } else {
      card.intervalDays = Math.max(4, Math.round(card.intervalDays * card.ease));
    }
    card.ease = Math.min(2.9, card.ease + 0.05);
  } else {
    card.streak = 0;
    card.intervalDays = 1;
    card.ease = Math.max(1.4, card.ease - 0.2);
  }

  card.reviews += 1;
  card.lastOutcome = success ? "success" : "fail";
  card.dueAt = Date.now() + card.intervalDays * DAY_MS;

  session.reviewRecorded = true;
  saveStore();
  void syncProgress();
}

function markSessionActive() {
  if (lessonState.session) {
    lessonState.session.hadMoves = true;
  }
}

function currentBookEntry() {
  if (!lessonState.inBook || !openingBook) {
    return null;
  }

  return openingBook.positionMap.get(positionKey(game.fen())) ?? null;
}

function selectSquare(square) {
  selectedSquare = square;
  legalTargets = game.moves({ square, verbose: true });
}

function clearSelection() {
  selectedSquare = null;
  legalTargets = [];
}

function chooseHeuristicMove() {
  const moves = game.moves({ verbose: true });
  if (!moves.length) {
    return null;
  }

  const profile = getStrengthProfile();
  const rootColor = game.turn();
  const scoredMoves = [];
  const orderedMoves = [...moves].sort((a, b) => moveOrderingScore(b) - moveOrderingScore(a));

  for (const move of orderedMoves) {
    game.move(move);
    const score = minimaxSearch(profile.depth - 1, -Infinity, Infinity, rootColor);
    game.undo();
    scoredMoves.push({ move, score });
  }

  scoredMoves.sort((a, b) => b.score - a.score);
  const bestScore = scoredMoves[0].score;
  const candidateMoves = scoredMoves
    .filter((entry) => entry.score >= bestScore - profile.varietyWindow)
    .slice(0, profile.maxCandidates);

  return pickWeightedCandidate(candidateMoves, bestScore, profile.temperature).move;
}

function getStrengthProfile() {
  const level = Number(strengthSelect.value);
  return STRENGTH_PROFILES[level] ?? STRENGTH_PROFILES[3];
}

function minimaxSearch(depth, alpha, beta, rootColor) {
  if (depth === 0 || game.isGameOver()) {
    return evaluatePosition(rootColor);
  }

  const maximizing = game.turn() === rootColor;
  const legalMoves = game.moves({ verbose: true }).sort((a, b) => moveOrderingScore(b) - moveOrderingScore(a));

  if (maximizing) {
    let value = -Infinity;
    for (const move of legalMoves) {
      game.move(move);
      value = Math.max(value, minimaxSearch(depth - 1, alpha, beta, rootColor));
      game.undo();
      alpha = Math.max(alpha, value);
      if (beta <= alpha) {
        break;
      }
    }
    return value;
  }

  let value = Infinity;
  for (const move of legalMoves) {
    game.move(move);
    value = Math.min(value, minimaxSearch(depth - 1, alpha, beta, rootColor));
    game.undo();
    beta = Math.min(beta, value);
    if (beta <= alpha) {
      break;
    }
  }
  return value;
}

function evaluatePosition(rootColor) {
  if (game.isCheckmate()) {
    return game.turn() === rootColor ? -1000 : 1000;
  }

  if (game.isDraw()) {
    return 0;
  }

  let score = 0;
  const boardState = game.board();

  for (let rankIndex = 0; rankIndex < boardState.length; rankIndex += 1) {
    for (let fileIndex = 0; fileIndex < boardState[rankIndex].length; fileIndex += 1) {
      const piece = boardState[rankIndex][fileIndex];
      if (!piece) {
        continue;
      }

      const square = `${FILES[fileIndex]}${8 - rankIndex}`;
      const sideFactor = piece.color === rootColor ? 1 : -1;
      score += sideFactor * PIECE_VALUES[piece.type];

      if (CENTER.has(square)) {
        score += sideFactor * centerBonus(piece.type);
      }

      if (
        (piece.type === "n" || piece.type === "b") &&
        STARTING_MINOR_SQUARES[piece.color][piece.type].has(square)
      ) {
        score -= sideFactor * 0.09;
      }

      if (piece.type === "k" && CASTLED_KING_SQUARES[piece.color].has(square)) {
        score += sideFactor * 0.2;
      }
    }
  }

  return score;
}

function moveOrderingScore(move) {
  let score = 0;

  if (move.captured) {
    score += PIECE_VALUES[move.captured] * 8;
    score -= PIECE_VALUES[move.piece];
  }

  if (move.promotion) {
    score += PIECE_VALUES[move.promotion] * 2;
  }

  if (move.san.includes("+")) {
    score += 1.4;
  }

  if (move.flags.includes("k") || move.flags.includes("q")) {
    score += 1.2;
  }

  if (CENTER.has(move.to)) {
    score += 0.2;
  }

  return score;
}

function centerBonus(pieceType) {
  if (pieceType === "n" || pieceType === "b") {
    return 0.12;
  }

  if (pieceType === "p") {
    return 0.08;
  }

  return 0.05;
}

function pickWeightedCandidate(candidates, bestScore, temperature) {
  if (!candidates.length) {
    return { move: null, score: bestScore };
  }

  const weighted = candidates.map((entry) => ({
    ...entry,
    weight: Math.exp((entry.score - bestScore) / temperature),
  }));

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry;
    }
  }

  return weighted[weighted.length - 1];
}

function renderAll() {
  renderBoard();
  renderOpeningInfo();
  renderCoaching();
  renderMoveLog();
  renderStats();
  renderStatus();
  renderSpacedStatus();
  renderAccountSection();
  renderAccountStatus();
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
      button.dataset.square = square;
      button.setAttribute("aria-label", square);

      if (piece) {
        appendPieceGlyph(button, piece);
      }

      button.addEventListener("click", () => handleSquareClick(square));
      boardEl.appendChild(button);
    }
  }
}

function appendPieceGlyph(container, piece) {
  const glyph = PIECE_GLYPHS[`${piece.color}${piece.type}`];
  if (!glyph) {
    return;
  }

  const pieceEl = document.createElement("span");
  pieceEl.className = `piece-glyph piece-${piece.color}${piece.type}`;
  pieceEl.textContent = glyph;
  container.appendChild(pieceEl);
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

  const total = openingBook?.maxPly ?? 1;
  const completed = lessonState.bestPly;
  const ratio = Math.min(1, completed / Math.max(total, 1));
  progressBarEl.style.width = `${Math.round(ratio * 100)}%`;

  if (lessonState.inBook) {
    const entry = currentBookEntry();
    if (entry && entry.options.size > 0) {
      const options = Array.from(entry.options.values())
        .slice(0, 3)
        .map((option) => option.san)
        .join(", ");

      if (game.turn() === playerSide) {
        progressTextEl.textContent = `Book progress: ${completed}/${total} plies. Recommended moves: ${options}.`;
      } else {
        progressTextEl.textContent = `Book progress: ${completed}/${total} plies. Opponent book responses include: ${options}.`;
      }
    } else {
      progressTextEl.textContent = `Book progress: ${completed}/${total} plies.`;
    }
  } else if (lessonState.session?.completed) {
    progressTextEl.textContent = "Opening line completed. Continue into middlegame plans.";
  } else {
    progressTextEl.textContent = `You left prepared lines at around ply ${completed + 1}. Keep playing the full game.`;
  }

  openingLineEl.innerHTML = "";
  for (const variation of openingBook.variationLines) {
    const li = document.createElement("li");
    li.className = "line-row";

    const nameSpan = document.createElement("span");
    nameSpan.className = "move-num";
    nameSpan.textContent = variation.name;

    const lineSpan = document.createElement("span");
    lineSpan.textContent = variation.line;

    li.append(nameSpan, lineSpan);
    openingLineEl.appendChild(li);
  }
}

function renderCoaching() {
  const opening = currentOpening();
  coachingListEl.innerHTML = "";

  const entry = currentBookEntry();
  if (lessonState.inBook && entry && entry.options.size > 0) {
    coachingTextEl.textContent = "Why this position matters and what good moves accomplish:";

    for (const option of entry.options.values()) {
      const li = document.createElement("li");
      li.className = "line-row";
      const note = firstSetValue(option.notes) || "Keeps your opening structure healthy and active.";
      li.textContent = `${option.san}: ${note}`;
      coachingListEl.appendChild(li);
    }
    return;
  }

  coachingTextEl.textContent = "Opening plans to keep in mind:";
  for (const idea of opening.keyIdeas.slice(0, 3)) {
    const li = document.createElement("li");
    li.className = "line-row";
    li.textContent = idea;
    coachingListEl.appendChild(li);
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

function renderStats() {
  const user = activeUser();
  const opening = currentOpening();
  const side = playerSide;
  const sideLabel = side === "w" ? "White" : "Black";

  statsListEl.innerHTML = "";

  if (!user) {
    statsSummaryEl.textContent = "Log in to save progress, run spaced repetition, and track stats per opening/side/strength.";
    return;
  }

  const strength = strengthSelect.value;
  const strengthBucket = readStatsBucket(user, opening.id, side, strength);
  const aggregate = aggregateStatsForOpeningSide(user, opening.id, side);
  const card = readRepetitionCard(user, opening.id, side);
  const dueCount = countDueOpenings(user, side);

  statsSummaryEl.textContent = `${user.username}: ${opening.name} as ${sideLabel}. Strength ${strength}. ${dueCount} opening(s) due for review.`;

  appendStatLine(`Lessons (${sideLabel}, strength ${strength}): ${strengthBucket.lessons}`);
  appendStatLine(`Opening accuracy: ${formatPercent(strengthBucket.openingCorrect, strengthBucket.openingAttempts)}`);
  appendStatLine(`Line completions: ${strengthBucket.completions}`);
  appendStatLine(`Off-book events: ${strengthBucket.offBookEvents}`);
  appendStatLine(
    `Finished games: ${strengthBucket.gamesFinished} (W${strengthBucket.wins} D${strengthBucket.draws} L${strengthBucket.losses})`,
  );
  appendStatLine(`All strengths accuracy (${sideLabel}): ${formatPercent(aggregate.openingCorrect, aggregate.openingAttempts)}`);

  if (card) {
    appendStatLine(`Spaced repetition streak: ${card.streak}, next due: ${formatDue(card.dueAt)}`);
  } else {
    appendStatLine("Spaced repetition: this opening is currently due now.");
  }
}

function appendStatLine(text) {
  const li = document.createElement("li");
  li.className = "line-row";
  li.textContent = text;
  statsListEl.appendChild(li);
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
  hintBtn.disabled = game.turn() !== playerSide || game.isGameOver() || isOpponentAnimating;
  takebackBtn.disabled = !takebackStack.length || isOpponentAnimating;

  recordGameResultIfNeeded();
}

function recordGameResultIfNeeded() {
  const session = lessonState.session;
  if (!session || session.gameRecorded || !game.isGameOver()) {
    return;
  }

  session.gameRecorded = true;

  const user = getSessionUser(session);
  if (!user) {
    return;
  }

  const bucket = ensureStatsBucket(user, session.openingId, session.side, session.strength);
  bucket.gamesFinished += 1;

  if (game.isDraw()) {
    bucket.draws += 1;
  } else {
    const winner = game.turn() === "w" ? "b" : "w";
    if (winner === session.side) {
      bucket.wins += 1;
    } else {
      bucket.losses += 1;
    }
  }

  saveStore();
  void syncProgress();
}

function setLessonMessage(message, tone) {
  lessonMessage = message;
  lessonMessageTone = tone;
}

function setAccountMessage(message, tone) {
  accountMessage = message;
  accountMessageTone = tone;
  renderAccountStatus();
}

function renderSpacedStatus() {
  const user = activeUser();
  if (!user) {
    spacedStatusEl.textContent = "Spaced repetition requires an account login.";
    return;
  }

  const due = countDueOpenings(user, playerSide);
  if (modeSelect.value === "spaced") {
    spacedStatusEl.textContent = `${due} opening(s) due as ${playerSide === "w" ? "White" : "Black"}.`;
  } else {
    spacedStatusEl.textContent = `${due} opening(s) currently due for spaced repetition.`;
  }
}

function renderAccountSection() {
  const user = activeUser();
  const loggedIn = Boolean(user);

  accountExpandedEl.hidden = loggedIn;
  accountCompactEl.hidden = !loggedIn;

  if (loggedIn) {
    accountCompactUserEl.textContent = `Logged in as ${user.username}.`;
    logoutBtn.disabled = false;
  } else {
    accountCompactUserEl.textContent = "";
  }
}

function renderAccountStatus() {
  const user = activeUser();

  if (!accountMessage) {
    accountStatusEl.className = "status";
    accountStatusEl.textContent = user
      ? `Logged in as ${user.username}. Progress syncs through your backend account.`
      : "Not logged in. Create an account to track progress across users.";
    return;
  }

  accountStatusEl.className = `status${accountMessageTone ? ` ${accountMessageTone}` : ""}`;
  accountStatusEl.textContent = accountMessage;
}

async function onCreateAccount() {
  const usernameRaw = newUsernameInput.value.trim();
  const passwordRaw = newPasswordInput.value;

  if (usernameRaw.length < 2) {
    setAccountMessage("Username must be at least 2 characters.", "bad");
    return;
  }

  if (passwordRaw.length < 6) {
    setAccountMessage("Password must be at least 6 characters.", "bad");
    return;
  }

  try {
    const response = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: usernameRaw,
        password: passwordRaw,
      }),
    });

    applyAuthenticatedUser(response);
    rememberUsername(response.user.username);
    await loadProgressFromBackend();
    saveStore();

    newUsernameInput.value = "";
    newPasswordInput.value = "";
    loginPasswordInput.value = "";

    populateUserSelect();
    setAccountMessage(`Account created. Logged in as ${response.user.username}.`, "good");

    if (modeSelect.value === "spaced") {
      resetLesson(true);
    } else {
      renderAll();
    }
  } catch (error) {
    setAccountMessage(error.message || "Could not create account.", "bad");
  }
}

async function onLogin() {
  const username = userSelect.value.trim();
  const password = loginPasswordInput.value;
  if (!username) {
    setAccountMessage("Select an account first.", "bad");
    return;
  }

  try {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
      }),
    });

    applyAuthenticatedUser(response);
    rememberUsername(response.user.username);
    await loadProgressFromBackend();
    saveStore();
    loginPasswordInput.value = "";

    setAccountMessage(`Logged in as ${response.user.username}.`, "good");
    populateUserSelect();
    renderAll();
  } catch (error) {
    setAccountMessage(error.message || "Could not log in.", "bad");
  }
}

function onLogout() {
  if (!activeUser()) {
    return;
  }

  commitLessonSession();
  dataStore.auth = { token: "", user: null };
  saveStore();

  if (modeSelect.value === "spaced") {
    modeSelect.value = "opening";
    setOpeningSelectorState();
    resetLesson(true);
  } else {
    renderAll();
  }

  setAccountMessage("Logged out.", "");
  populateUserSelect();
}

function populateUserSelect() {
  userSelect.innerHTML = "";

  if (!dataStore.savedUsernames.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No accounts yet";
    userSelect.appendChild(option);
    userSelect.disabled = true;
    logoutBtn.disabled = true;
    loginBtn.disabled = true;
    renderAccountSection();
    return;
  }

  userSelect.disabled = false;
  loginBtn.disabled = false;

  for (const username of dataStore.savedUsernames) {
    const option = document.createElement("option");
    option.value = username;
    option.textContent = username;
    userSelect.appendChild(option);
  }

  const active = activeUser();
  if (active) {
    userSelect.value = active.username;
    logoutBtn.disabled = false;
  } else {
    userSelect.selectedIndex = 0;
    logoutBtn.disabled = true;
  }

  renderAccountSection();
}

function activeUser() {
  return dataStore.auth.user ?? null;
}

function getSessionUser(session) {
  const user = activeUser();
  if (!session?.userId || !user) {
    return null;
  }
  return user.id === session.userId ? user : null;
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultStore();
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return createDefaultStore();
    }

    return {
      version: 1,
      auth: {
        token: parsed.auth?.token ?? "",
        user: parsed.auth?.user ?? null,
      },
      savedUsernames: Array.isArray(parsed.savedUsernames) ? parsed.savedUsernames : [],
    };
  } catch {
    return createDefaultStore();
  }
}

function saveStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataStore));
  } catch {
    setAccountMessage("Could not save data locally. Storage might be unavailable.", "bad");
  }
}

function createDefaultStore() {
  return {
    version: 1,
    auth: {
      token: "",
      user: null,
    },
    savedUsernames: [],
  };
}

function ensureStatsBucket(user, openingId, side, strength) {
  if (!user.stats) {
    user.stats = {};
  }

  if (!user.stats[openingId]) {
    user.stats[openingId] = { w: {}, b: {} };
  }

  if (!user.stats[openingId][side]) {
    user.stats[openingId][side] = {};
  }

  if (!user.stats[openingId][side][strength]) {
    user.stats[openingId][side][strength] = {
      lessons: 0,
      openingAttempts: 0,
      openingCorrect: 0,
      offBookEvents: 0,
      completions: 0,
      gamesFinished: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    };
  }

  return user.stats[openingId][side][strength];
}

function readStatsBucket(user, openingId, side, strength) {
  return (
    user.stats?.[openingId]?.[side]?.[strength] ?? {
      lessons: 0,
      openingAttempts: 0,
      openingCorrect: 0,
      offBookEvents: 0,
      completions: 0,
      gamesFinished: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    }
  );
}

function aggregateStatsForOpeningSide(user, openingId, side) {
  const sideStats = user.stats?.[openingId]?.[side] ?? {};
  const total = {
    lessons: 0,
    openingAttempts: 0,
    openingCorrect: 0,
    offBookEvents: 0,
    completions: 0,
    gamesFinished: 0,
    wins: 0,
    losses: 0,
    draws: 0,
  };

  for (const bucket of Object.values(sideStats)) {
    total.lessons += bucket.lessons ?? 0;
    total.openingAttempts += bucket.openingAttempts ?? 0;
    total.openingCorrect += bucket.openingCorrect ?? 0;
    total.offBookEvents += bucket.offBookEvents ?? 0;
    total.completions += bucket.completions ?? 0;
    total.gamesFinished += bucket.gamesFinished ?? 0;
    total.wins += bucket.wins ?? 0;
    total.losses += bucket.losses ?? 0;
    total.draws += bucket.draws ?? 0;
  }

  return total;
}

function ensureRepetitionCard(user, openingId, side) {
  if (!user.repetition) {
    user.repetition = {};
  }

  if (!user.repetition[openingId]) {
    user.repetition[openingId] = { w: null, b: null };
  }

  if (!user.repetition[openingId][side]) {
    user.repetition[openingId][side] = {
      dueAt: 0,
      intervalDays: 0,
      ease: 2.5,
      streak: 0,
      reviews: 0,
      lastOutcome: null,
    };
  }

  return user.repetition[openingId][side];
}

function readRepetitionCard(user, openingId, side) {
  return user.repetition?.[openingId]?.[side] ?? null;
}

function countDueOpenings(user, side) {
  const now = Date.now();
  let dueCount = 0;

  for (const opening of OPENINGS) {
    const card = readRepetitionCard(user, opening.id, side);
    const dueAt = card?.dueAt ?? 0;
    if (dueAt <= now) {
      dueCount += 1;
    }
  }

  return dueCount;
}

function chooseSpacedOpening(user, side) {
  const now = Date.now();

  const ranked = OPENINGS.map((opening) => {
    const card = readRepetitionCard(user, opening.id, side);
    const dueAt = card?.dueAt ?? 0;
    const overdue = dueAt <= now;
    const mastery = estimateMastery(user, opening.id, side, card);

    return {
      id: opening.id,
      dueAt,
      overdue,
      mastery,
    };
  });

  const dueItems = ranked
    .filter((item) => item.overdue)
    .sort((a, b) => a.dueAt - b.dueAt || a.mastery - b.mastery);

  if (dueItems.length) {
    return dueItems[0].id;
  }

  ranked.sort((a, b) => a.mastery - b.mastery || a.dueAt - b.dueAt);
  return ranked[0].id;
}

function estimateMastery(user, openingId, side, card) {
  const aggregate = aggregateStatsForOpeningSide(user, openingId, side);
  const accuracy =
    aggregate.openingAttempts > 0 ? aggregate.openingCorrect / aggregate.openingAttempts : 0.45;
  const completionComponent = Math.min(aggregate.completions / 10, 1);
  const streakComponent = Math.min((card?.streak ?? 0) / 8, 1);

  return accuracy * 0.6 + completionComponent * 0.25 + streakComponent * 0.15;
}

function getOpeningBook(opening) {
  if (OPENING_BOOK_CACHE.has(opening.id)) {
    return OPENING_BOOK_CACHE.get(opening.id);
  }

  const positionMap = new Map();
  let maxPly = 0;
  const variationLines = [];

  for (const variation of opening.variations) {
    const sim = new Chess();
    const sanList = [];

    for (let ply = 0; ply < variation.moves.length; ply += 1) {
      const step = variation.moves[ply];
      const key = positionKey(sim.fen());

      if (!positionMap.has(key)) {
        positionMap.set(key, { ply, options: new Map() });
      }

      const entry = positionMap.get(key);
      const normalized = normalizeSan(step.san);

      if (!entry.options.has(normalized)) {
        entry.options.set(normalized, {
          san: step.san,
          notes: new Set(),
          variations: new Set(),
          nextPly: ply + 1,
          terminal: false,
        });
      }

      const option = entry.options.get(normalized);
      option.variations.add(variation.name);
      option.nextPly = Math.max(option.nextPly, ply + 1);
      if (step.note) {
        option.notes.add(step.note);
      }
      if (ply === variation.moves.length - 1) {
        option.terminal = true;
      }

      const applied = sim.move(step.san);
      if (!applied) {
        break;
      }

      sanList.push(step.san);
      maxPly = Math.max(maxPly, ply + 1);
    }

    variationLines.push({
      name: variation.name,
      line: formatVariationLine(sanList),
    });
  }

  const book = { positionMap, maxPly, variationLines };
  OPENING_BOOK_CACHE.set(opening.id, book);
  return book;
}

function formatVariationLine(sans) {
  const chunks = [];
  for (let index = 0; index < sans.length; index += 2) {
    const moveNumber = Math.floor(index / 2) + 1;
    const whiteMove = sans[index] ?? "";
    const blackMove = sans[index + 1] ?? "";
    chunks.push(`${moveNumber}. ${whiteMove}${blackMove ? ` ${blackMove}` : ""}`.trim());
  }
  return chunks.join(" ");
}

function positionKey(fen) {
  return fen.split(" ").slice(0, 4).join(" ");
}

function normalizeSan(san) {
  return san.replace(/[+#?!]/g, "");
}

function collectNotesFromEntry(entry) {
  const notes = new Set();
  for (const option of entry.options.values()) {
    for (const note of option.notes) {
      notes.add(note);
    }
  }
  return notes;
}

function firstSetValue(set) {
  for (const value of set) {
    return value;
  }
  return "";
}

function formatPercent(correct, attempts) {
  if (!attempts) {
    return "0%";
  }
  return `${Math.round((correct / attempts) * 100)}%`;
}

function formatDue(timestamp) {
  if (!timestamp || timestamp <= Date.now()) {
    return "Now";
  }

  const delta = timestamp - Date.now();
  const days = Math.ceil(delta / DAY_MS);
  if (days <= 1) {
    return "< 1 day";
  }
  return `${days} days`;
}

function validateOpeningCatalog() {
  for (const opening of OPENINGS) {
    for (const variation of opening.variations) {
      const sim = new Chess();
      for (const step of variation.moves) {
        const applied = sim.move(step.san);
        if (!applied) {
          console.warn(`Invalid opening line in ${opening.name} / ${variation.name}:`, step.san);
          break;
        }
      }
    }
  }
}

function pushTakebackSnapshot() {
  takebackStack.push({
    moves: game.history({ verbose: true }).map((move) => ({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    })),
    lessonState: cloneLessonState(lessonState),
    selectedSquare,
    legalTargets: legalTargets.map((move) => ({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    })),
  });
}

function restoreSnapshot(snapshot) {
  game = new Chess();
  for (const move of snapshot.moves) {
    game.move(move);
  }

  lessonState = cloneLessonState(snapshot.lessonState);
  selectedSquare = snapshot.selectedSquare;
  legalTargets = [];

  if (selectedSquare) {
    legalTargets = game.moves({ square: selectedSquare, verbose: true });
  } else if (snapshot.legalTargets.length) {
    legalTargets = snapshot.legalTargets
      .map((savedMove) =>
        game.moves({ verbose: true }).find(
          (move) =>
            move.from === savedMove.from &&
            move.to === savedMove.to &&
            (move.promotion ?? "") === (savedMove.promotion ?? ""),
        ),
      )
      .filter(Boolean);
  }
}

function cloneLessonState(state) {
  return {
    inBook: state.inBook,
    bestPly: state.bestPly,
    session: state.session
      ? {
          ...state.session,
        }
      : null,
  };
}

async function restoreSession() {
  if (!dataStore.auth.token) {
    return;
  }

  try {
    const response = await apiRequest("/auth/me", {
      token: dataStore.auth.token,
    });

    dataStore.auth.user = {
      ...response.user,
      stats: dataStore.auth.user?.stats ?? {},
      repetition: dataStore.auth.user?.repetition ?? {},
    };
    rememberUsername(response.user.username);
    await loadProgressFromBackend();
    saveStore();
  } catch {
    dataStore.auth = {
      token: "",
      user: null,
    };
    saveStore();
  }
}

function applyAuthenticatedUser(response) {
  dataStore.auth = {
    token: response.token,
    user: {
      ...response.user,
      stats: {},
      repetition: {},
    },
  };
}

function rememberUsername(username) {
  if (!username) {
    return;
  }

  if (!dataStore.savedUsernames.includes(username)) {
    dataStore.savedUsernames.push(username);
    dataStore.savedUsernames.sort((a, b) => a.localeCompare(b));
  }
}

async function loadProgressFromBackend() {
  const user = activeUser();
  if (!user || !dataStore.auth.token) {
    return;
  }

  const response = await apiRequest("/progress", {
    token: dataStore.auth.token,
  });

  user.stats = {};
  user.repetition = {};

  for (const item of response.progress ?? []) {
    const bucket = ensureStatsBucket(user, item.opening_id, item.side, String(item.strength));
    bucket.lessons = item.lessons ?? 0;
    bucket.openingAttempts = item.opening_attempts ?? 0;
    bucket.openingCorrect = item.opening_correct ?? 0;
    bucket.offBookEvents = item.off_book_events ?? 0;
    bucket.completions = item.completions ?? 0;
    bucket.gamesFinished = item.games_finished ?? 0;
    bucket.wins = item.wins ?? 0;
    bucket.losses = item.losses ?? 0;
    bucket.draws = item.draws ?? 0;
  }

  for (const cardRow of response.repetition ?? []) {
    const card = ensureRepetitionCard(user, cardRow.opening_id, cardRow.side);
    card.dueAt = cardRow.due_at ? new Date(cardRow.due_at).getTime() : 0;
    card.intervalDays = Number(cardRow.interval_days ?? 0);
    card.ease = Number(cardRow.ease ?? 2.5);
    card.streak = Number(cardRow.streak ?? 0);
    card.reviews = Number(cardRow.reviews ?? 0);
    card.lastOutcome = cardRow.last_outcome ?? null;
  }
}

async function syncProgress() {
  const user = activeUser();
  if (!user || !dataStore.auth.token) {
    return;
  }

  try {
    await apiRequest("/progress", {
      method: "PUT",
      token: dataStore.auth.token,
      body: JSON.stringify(serializeProgressPayload(user)),
    });
  } catch (error) {
    console.error("Could not sync progress", error);
  }
}

function serializeProgressPayload(user) {
  const progress = [];
  const repetition = [];

  for (const [openingId, openingStats] of Object.entries(user.stats ?? {})) {
    for (const side of ["w", "b"]) {
      const sideStats = openingStats?.[side] ?? {};
      for (const [strength, bucket] of Object.entries(sideStats)) {
        progress.push({
          opening_id: openingId,
          side,
          strength: Number(strength),
          lessons: bucket.lessons ?? 0,
          opening_attempts: bucket.openingAttempts ?? 0,
          opening_correct: bucket.openingCorrect ?? 0,
          off_book_events: bucket.offBookEvents ?? 0,
          completions: bucket.completions ?? 0,
          games_finished: bucket.gamesFinished ?? 0,
          wins: bucket.wins ?? 0,
          losses: bucket.losses ?? 0,
          draws: bucket.draws ?? 0,
        });
      }
    }
  }

  for (const [openingId, openingCards] of Object.entries(user.repetition ?? {})) {
    for (const side of ["w", "b"]) {
      const card = openingCards?.[side];
      if (!card) {
        continue;
      }

      repetition.push({
        opening_id: openingId,
        side,
        due_at: new Date(card.dueAt || 0).toISOString(),
        interval_days: card.intervalDays ?? 0,
        ease: card.ease ?? 2.5,
        streak: card.streak ?? 0,
        reviews: card.reviews ?? 0,
        last_outcome: card.lastOutcome ?? null,
      });
    }
  }

  return { progress, repetition };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}
