let playerUserName = prompt("enter a username") || "nein";
const socket = io("https://cheesechess-production.up.railway.app", {
  auth: {
    username: playerUserName,
  }
});

function resignButton() {
  if (game.colorToMove === myColor) {
    document.getElementById("resign").disabled = false;
    document.getElementById("resign").style.backgroundColor = "rgb(242, 89, 89)";
  } else {
    document.getElementById("resign").disabled = true;
    document.getElementById("resign").style.backgroundColor = "rgb(69, 24, 24)";
  }
}

const dir = [[-1, 0], [0, 1], [1, 0], [0, -1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
const Nmoves = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
const startingPos = {
  board: [["wL", "wL", "wL", "yR", "yN", "yB", "yK", "yQ", "yB", "yN", "yR", "wL", "wL", "wL"], ["wL", "wL", "wL", "yP", "yP", "yP", "yP", "yP", "yP", "yP", "yP", "wL", "wL", "wL"], ["wL", "wL", "wL", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wL", "wL", "wL"], ["bR", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gR"], ["bN", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gN"], ["bB", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gB"], ["bK", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gQ"], ["bQ", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gK"], ["bB", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gB"], ["bN", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gN"], ["bR", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gR"], ["wL", "wL", "wL", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wL", "wL", "wL"], ["wL", "wL", "wL", "rP", "rP", "rP", "rP", "rP", "rP", "rP", "rP", "wL", "wL", "wL"], ["wL", "wL", "wL", "rR", "rN", "rB", "rQ", "rK", "rB", "rN", "rR", "wL", "wL", "wL"]],
  castling: { r: [true, true], b: [true, true], y: [true, true], g: [true, true] },
  turn: "r",
  pts: { r: 0, b: 0, y: 0, g: 0, },
  ep: { r: null, b: null, y: null, g: null },
  players: ["r", "b", "y", "g"]
}
let game;
let playerToResign;
let winningTeam;
let allJoined = false;
let myColor;
let ev;
let okay = "hi, everything is working"; /* bc yes */
let mouseOn = null;
let piece;
let moveSquare;
let legalMoves = [];
let allColors = ["r", "b", "y", "g"];
let allColorNames = ["red", "blue", "yellow", "green"];
let moveViewing = 0;
let isP;
document.getElementById("yPts").textContent = 0;
document.getElementById("rPts").textContent = 0;
document.getElementById("bPts").textContent = 0;
document.getElementById("gPts").textContent = 0;
let checkRule = true;
if (game?.gameMode === 3) { checkRule = false; }
const board = document.getElementById("board");
for (let y = 0; y < 14; y++) {
  for (let x = 0; x < 14; x++) {
    const square = document.createElement("div");
    /*coordinates for skware!!!!!*/
    square.dataset.x = x;
    square.dataset.y = y;
    /*corners = empty, normal square is square*/
    if ((x > 10 || x < 3) && (y > 10 || y < 3)) {
      square.className = "empty";
    } else {
      if ((x + y) % 2 == 1) { square.className = "darkSq"; } else { square.className = "lightSq" }
    }
    board.appendChild(square);
  }
}

/*for clicking squrs*/
board.addEventListener("click", whenClick);


function setUpPosition(pos) {
  const { pieces, castlingRights, doublePawnMoves, playerPts, colorToMove, playerColors } = pos;
  game.pieces = structuredClone(pieces);
  game.castlingRights = structuredClone(castlingRights);
  game.doublePawnMoves = structuredClone(doublePawnMoves);
  game.playerColors = structuredClone(playerColors);
  game.playerPts = structuredClone(playerPts);
  game.colorToMove = structuredClone(colorToMove);
  drawPieces();
}

function drawPieces() {
  const squares = board.children;
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < 14; x++) {
      const index = y * 14 + x;
      const piece = game.pieces[y][x];
      squares[index].replaceChildren();
      if (piece && !("wLwW".includes(piece))) {
        const img = document.createElement("img");
        img.src = "assets/" + piece + ".svg";
        img.classList.add("piece");
        squares[index].appendChild(img);
      }
    }
  }
  for (let move of legalMoves) {
    const index = move.y * 14 + move.x;
    const square = squares[index];
    const dot = document.createElement("img");
    if (game.pieces[move.y][move.x][0] === "w") {
      dot.src = "assets/dot.svg";
    } else {
      dot.src = "assets/ring.svg";
    }
    dot.classList.add("dot");
    square.appendChild(dot);
  }
  document.getElementById("yPts").textContent = game.playerPts.y;
  document.getElementById("rPts").textContent = game.playerPts.r;
  document.getElementById("bPts").textContent = game.playerPts.b;
  document.getElementById("gPts").textContent = game.playerPts.g;
}

function getLegalMoves(px, py, ptype, pcolor) {
  const dirx = dir[allColors.indexOf(pcolor)][1];
  const diry = dir[allColors.indexOf(pcolor)][0];
  legalMoves = [];
  if (ptype === "P") {
    if (game.pieces[py + diry][px + dirx] === "wW") {
      legalMoves.push({ y: py + diry, x: px + dirx });
      if (((diry && py === 6.5 - diry * 5.5) || (dirx && px === 6.5 - dirx * 5.5)) && (game.pieces[py + diry * 2][px + dirx * 2] === "wW")) {
        legalMoves.push({ y: py + diry * 2, x: px + dirx * 2, specialMove: "double" });
      }
    }
    if (game.pieces[py + diry + dirx]?.[px + diry + dirx] !== "wW") {
      legalMoves.push({ y: py + diry + dirx, x: px + diry + dirx });
    }
    if (game.pieces[py + diry - dirx]?.[px - diry + dirx] !== "wW") {
      legalMoves.push({ y: py + diry - dirx, x: px - diry + dirx });
    }
    const idkidkidk = Object.keys(game.doublePawnMoves).find(key => game.doublePawnMoves[key] === `${py + diry + dirx},${px + diry + dirx}`);
    const idkidkidkidk = Object.keys(game.doublePawnMoves).find(key => game.doublePawnMoves[key] === `${py + diry - dirx},${px - diry + dirx}`);

    if (idkidkidk !== pcolor && idkidkidkidk !== pcolor) {
      if (Object.values(game.doublePawnMoves).includes(`${py + diry + dirx},${px + diry + dirx}`)) {
        legalMoves.push({ y: py + diry + dirx, x: px + diry + dirx, specialMove: "ep" });
      }
      if (Object.values(game.doublePawnMoves).includes(`${py + diry - dirx},${px - diry + dirx}`)) {
        legalMoves.push({ y: py + diry - dirx, x: px - diry + dirx, specialMove: "ep" });
      }
    }
  } else if (ptype === "N") {
    for (let i = 0; i <= 7; i++) {
      if (py + Nmoves[i][0] >= 0 && py + Nmoves[i][0] <= 13 && px + Nmoves[i][1] >= 0 && px + Nmoves[i][1] <= 13) {
        legalMoves.push({ y: py + Nmoves[i][0], x: px + Nmoves[i][1] });
      }
    }
  } else if (ptype === "K") {
    for (let i = 0; i <= 7; i++) {
      if (py + dir[i][0] >= 0 && py + dir[i][0] <= 13 && px + dir[i][1] >= 0 && px + dir[i][1] <= 13) {
        legalMoves.push({ y: py + dir[i][0], x: px + dir[i][1] });
      }
    }
    /*castling moves*/
    if (game.castlingRights[pcolor][0]) {
      if (game.pieces[py - dirx][px - diry] === "wW" && game.pieces[py - dirx * 2][px - diry * 2] === "wW") {
        if (!isKingInCheck(pcolor, py - dirx, px - diry) && !isKingInCheck(pcolor, py - dirx * 2, px - diry * 2)) {
          legalMoves.push({ y: py - dirx * 2, x: px - diry * 2, specialMove: "O-O" });
        }
      }
    }
    if (game.castlingRights[pcolor][1]) {
      if (game.pieces[py + dirx][px + diry] === "wW" && game.pieces[py + dirx * 2][px + diry * 2] === "wW" && game.pieces[py + dirx * 3][px + diry * 3] === "wW") {
        if (!isKingInCheck(pcolor, py + dirx, px + diry) && !isKingInCheck(pcolor, py + dirx * 2, px + diry * 2) && !isKingInCheck(pcolor, py + dirx * 3, px + diry * 3)) {
          legalMoves.push({ y: py + dirx * 2, x: px + diry * 2, specialMove: "O-O-O" });
        }
      }
    }
  } else if (ptype === "B") {
    for (let i = 4; i <= 7; i++) {
      let sY = py;
      let sX = px;
      while ((sY === py) || game.pieces[sY]?.[sX] === "wW") {
        sY += dir[i][0];
        sX += dir[i][1];
        legalMoves.push({ y: sY, x: sX });
      }
    }
  } else if (ptype === "R") {
    for (let i = 0; i <= 3; i++) {
      let sY = py;
      let sX = px;
      while ((sY === py && sX === px) || game.pieces[sY]?.[sX] === "wW") {
        sY += dir[i][0];
        sX += dir[i][1];
        legalMoves.push({ y: sY, x: sX });
      }
    }
  } else if (ptype === "Q") {
    for (let i = 0; i <= 7; i++) {
      let sY = py;
      let sX = px;
      while ((sY === py && sX === px) || game.pieces[sY]?.[sX] === "wW") {
        sY += dir[i][0];
        sX += dir[i][1];
        legalMoves.push({ y: sY, x: sX });
      }
    }
  }
  filterLegalMoves(px, py, ptype, pcolor);
}
let boardRot = 0;
function rotBoard(color = 1) {
  if (color === "r") gameArea.className = "rot0";
  if (color === "b") gameArea.className = "rot270";
  if (color === "y") gameArea.className = "rot180";
  if (color === "g") gameArea.className = "rot90";
  if (color === 1) { boardRot = (boardRot + 3) % 4; gameArea.className = "rot" + (90 * boardRot); }
}
function checkPromoting(y, x) {
  ev = null;
  if (piece[1] === "P") {
    const pieceColor = piece[0];
    let isPromoting = false;
    if (pieceColor === "r") {
      if (y === 6) { isPromoting = true; }
    } else if (pieceColor === "y") {
      if (y === 7) { isPromoting = true; }
    } else if (pieceColor === "b") {
      if (x === 7) { isPromoting = true; }
    } else if (pieceColor === "g") {
      if (x === 6) { isPromoting = true; }
    }
    if (isPromoting) {
      let promotion = prompt("Promote to Q (queen, default), R (rook),\nB (bishop), or N (knight)", "Q");
      if (!"QRBN".includes(promotion) || promotion === "") { promotion = "Q"; }
      piece = piece[0] + promotion;
      ev = promotion;
    }
    isP = isPromoting;
  }
}

function canMove() {
  return game.gameState !== "finished" && game.moves.length === moveViewing && Object.values(game.usersInGame).every(d => d !== null);
}

function whenClick(event) {
  if (game.usersInGame[game.colorToMove] === socket.id) {
    if (canMove()) {
      const square = event.target;
      const x = Number(square.dataset.x);
      const y = Number(square.dataset.y);
      if (isNaN(x + y)) return;
      if (game.pieces[y][x] === "wL") return;
      if (mouseOn === null) {
        getClick(y, x);
      } else {
        if (isLegal(mouseOn.y, mouseOn.x, y, x, game.colorToMove)) {
          piece = game.pieces[mouseOn.y][mouseOn.x];

          checkPromoting(y, x);
          sendMove({ fy: mouseOn.y, fx: mouseOn.x, ty: y, tx: x, special: ev });
          legalMoves = [];
          mouseOn = null;
        } else {
          getClick(y, x);
        }

      }
    }
  }
}

function isLegal(fy, fx, ty, tx, pcolor) {
  const backupMoves = legalMoves;
  legalMoves = [];

  getLegalMoves(fx, fy, game.pieces[fy][fx][1], pcolor);

  const isMoveLegal = legalMoves.some(m => m.x === tx && m.y === ty);

  legalMoves = backupMoves;
  return isMoveLegal;
}

function getClick(y, x) {
  if (game.pieces[y][x] === "wW") return;
  mouseOn = { x, y };
  if ((game.pieces[y][x][0] === game.colorToMove)) {
    getLegalMoves(x, y, game.pieces[y][x][1], game.pieces[y][x][0]);
  }
  console.log("mouse at", y, x);
  if (legalMoves.length === 0) {
    mouseOn = null;
  }
  drawPieces();
}

function tryMove(fy, fx, ty, tx, pcolor) {
  const dirx = dir[allColors.indexOf(pcolor)][1];
  const diry = dir[allColors.indexOf(pcolor)][0];
  let didMove = false;
  isP = false;
  ev = null;
  moveSquare = game.pieces[ty][tx]
  const captured = moveSquare;
  piece = game.pieces[fy][fx];
  if (moveSquare[0] !== piece[0] && !(moveSquare[0] === game.playerColors[((game.playerColors.indexOf(piece[0])) + 2) % 4] && game.gameMode === 2)) {
    if ((fx !== tx) || (fy !== ty)) {
      if ((moveSquare[0] !== piece[0])) {
        if (legalMoves.some(m => m.x === tx && m.y === ty)) {
          let legalSquares = legalMoves.map((m) => `${m.y},${m.x}`);
          let moveIndex = legalSquares.indexOf(`${ty},${tx}`);
          const dirx = dir[allColors.indexOf(game.colorToMove)][1];
          const diry = dir[allColors.indexOf(game.colorToMove)][0];
          game.pieces[ty][tx] = piece;
          pieces[fy][fx] = "wW";
          if (piece[1] === "K") {
            if (legalMoves[moveIndex]?.specialMove === "O-O") {
              pieces[fy - dirx * 3][fx - diry * 3] = "wW";
              pieces[fy - dirx][fx - diry] = game.colorToMove + "R";
            }
            if (legalMoves[moveIndex]?.specialMove === "O-O-O") {
              pieces[fy + dirx * 4][fx + diry * 4] = "wW";
              pieces[fy + dirx][fx + diry] = colorToMove + "R";
            }
            kingLocations[pcolor][0] = ty;
            kingLocations[pcolor][1] = tx;
          }
          if (piece[1] === "R") {
            let queensideR = [[13, 3], [10, 0], [0, 10], [3, 13]];
            let kingsideR = [[13, 10], [3, 0], [0, 3], [10, 13]];
            if (kingsideR.some(([y, x]) => y === fy && x === fx)) {
            }
            if (queensideR.some(([y, x]) => y === fy && x === fx)) {
            }
          }
        }
      }
    }
  }
  return didMove;
}

function nextMove(turn) {
  let indexx = game.playerColors.indexOf(turn);
  if (game.playerColors.length < 2) {

  }
  moveViewing = game.moves.length;

  game.fiftyRule++;
  if (game.fiftyRule >= 200) {
    game.winningTeam = "draw";
    //endGame(game.gameMode, "fif");
  } else {
    const counts = {};
    let test = false;

    for (let x of game.boardHistory) {
      counts[x] = (counts[x] || 0) + 1;
      if (counts[x] >= 3) {
        test = true;
      }
    }
    if (test) {
      winningTeam = "draw";
      //endGame(game.gameMode, "rep")
    }
  }
  resignButton();
}

function filterLegalMoves(px, py, ptype, pcolor) {
  let mx, my, mpiece;
  let inCheck = false;
  for (let i = 0; i < legalMoves.length; i++) {
    inCheck = false;
    mx = legalMoves[i].x;
    my = legalMoves[i].y;
    if (!(my >= 0 && mx >= 0 && my <= 13 && mx <= 13)) {
      legalMoves.splice(i, 1);
      i--;
      continue;
    }
    mpiece = game.pieces[my][mx];
    if (mpiece === "wL" || mpiece[0] === pcolor) {
      legalMoves.splice(i, 1);
      i--;
      continue;
    }
    if (ptype === "K") {
      inCheck = isKingInCheck(pcolor, my, mx, py, px, my, mx);
    } else {
      inCheck = isKingInCheck(pcolor, game.kingLocations[pcolor][0], game.kingLocations[pcolor][1], py, px, my, mx);
    }
    if (inCheck) {
      legalMoves.splice(i, 1);
      i--;
      continue;
    }
  }
}
function isKingInCheck(kcolor, ky, kx, py, px, ty, tx) {
  let inCheck = false;
  let testSquare;
  let isTestMove = (py !== undefined);
  const backupBoard = game.pieces.map(r => r.slice());
  const backupKing = [...game.kingLocations[kcolor]];
  if (isTestMove) {
    const movingPiece = game.pieces[py][px];
    game.pieces[ty][tx] = movingPiece;
    game.pieces[py][px] = "wW";
    if (0) { tryMove(py, px, ty, tx, true, kcolor); }
  }
  /*pawn*/
  for (let j = 0; j <= 3; j++) {
    const dirx = dir[j][1];
    const diry = dir[j][0];
    testSquare = game.pieces[ky - diry - dirx]?.[kx - diry - dirx];
    if (testSquare === allColors[j] + "P" && testCheck(testSquare, kcolor)) {
      inCheck = true;
      break;
    }
    testSquare = game.pieces[ky - diry + dirx]?.[kx + diry - dirx];
    if (testSquare === allColors[j] + "P" && testCheck(testSquare, kcolor)) {
      inCheck = true;
      break;
    }
  }
  /*knight*/
  for (let j = 0; j <= 7; j++) {
    testSquare = game.pieces[ky + Nmoves[j][0]]?.[kx + Nmoves[j][1]];
    if (testSquare?.[1] === "N" && testCheck(testSquare, kcolor)) {
      inCheck = true;
      break;
    }
  }
  /*king*/
  for (let j = 0; j <= 7; j++) {
    testSquare = game.pieces[ky + dir[j][0]]?.[kx + dir[j][1]];
    if (testSquare?.[1] === "K" && testCheck(testSquare, kcolor)) {
      inCheck = true;
      break;
    }
  }
  /*bishop*/
  for (let j = 4; j <= 7; j++) {
    let sY = ky;
    let sX = kx;
    while ((sY === ky) || game.pieces[sY]?.[sX] === "wW") {
      sY += dir[j][0];
      sX += dir[j][1];
      testSquare = game.pieces[sY]?.[sX];
      if (testSquare?.[1] === "B" && testCheck(testSquare, kcolor)) {
        inCheck = true;
        break;
      }
    }
  }
  /*rook*/
  for (let j = 0; j <= 3; j++) {
    let sY = ky;
    let sX = kx;
    while ((sY === ky && sX === kx) || game.pieces[sY]?.[sX] === "wW") {
      sY += dir[j][0];
      sX += dir[j][1];
      testSquare = game.pieces[sY]?.[sX];
      if (testSquare?.[1] === "R" && testCheck(testSquare, kcolor)) {
        inCheck = true;
        break;
      }
    }
  }
  /*queen*/
  for (let j = 0; j <= 7; j++) {
    let sY = ky;
    let sX = kx;
    while ((sY === ky && sX === kx) || game.pieces[sY]?.[sX] === "wW") {
      sY += dir[j][0];
      sX += dir[j][1];
      testSquare = game.pieces[sY]?.[sX];
      if (testSquare?.[1] === "Q" && testCheck(testSquare, kcolor)) {
        inCheck = true;
        break;
      }
    }
  }
  if (isTestMove) {
    if (isTestMove) { game.pieces = backupBoard; game.kingLocations[kcolor] = backupKing; }
  }
  return inCheck;
}

function testCheck(testSquare, kcolor) {
  return (testSquare?.[0] !== kcolor || (game.gameMode === 2 && testSquare?.[0] !== allColors[(allColors.indexOf(kcolor) + 2) % 4]));
}

function existsLegalMove(pcolor) {
  for (let y = 0; y <= 13; y++) {
    for (let x = 0; x <= 13; x++) {
      let piece = game.pieces[y][x];
      if (!"wWwL".includes(piece) && piece?.[0] === pcolor) {
        getLegalMoves(x, y, piece[1], pcolor);
        if (legalMoves.length) { return true; }
      }
    }
  }
  return false;
}

function sendInChat(message) {
  socket.emit("chatMessage", message);
}

function resign() {
  if (canMove()) {
    sendInChat(`\n${allColorNames[allColors.indexOf(game.colorToMove)]} resigned`);
    playerToResign = game.colorToMove;
    sendMove("res");
    nextMove(playerToResign, "res");
  }
}

socket.on("updateClients", (pos) => {
  updateClients(pos);
});

function updateClients(pos) {
  game = pos;
  resignButton();
  applyMove(pos);
}

socket.on("connect", () => {
  console.log("Connected to server with ID:", socket.id);
});

// send moves
function sendMove(pos) {
  if (pos === "res") {
    socket.emit("res", playerToResign);
  } else {
    socket.emit("move", pos);
  }
}


socket.on("newGame", () => {
  newGame();
});

function applyMove(pos) {
  setUpPosition(pos);
  nextMove(game.colorToMove);
}


socket.on("endGame", (results) => {
  endGame(results);
});

function endGame(results) {
  drawPieces();
  if (game.gameMode !== 2) {
    document.getElementById("rPts").textContent = game.playerPts["r"];
    document.getElementById("bPts").textContent = game.playerPts["b"];
    document.getElementById("yPts").textContent = game.playerPts["y"];
    document.getElementById("gPts").textContent = game.playerPts["g"];
  }

  document.getElementById("results").innerText = results;
  document.getElementById("endGame").classList.remove("hidden");
}

function undoRedoMove(ur = "undo") {
  if (ur === "undo" && moveViewing > 0) {
    moveViewing--;
    setUpPosition(JSON.parse(game.boardHistory[moveViewing]));
  }
  if (ur === "redo" && moveViewing < game.moves.length) {
    moveViewing++;
    setUpPosition(JSON.parse(game.boardHistory[moveViewing]));
  }
}

/* test position
if (0) {
  pieces = pieces.map(row => row.map(() => "wW"));
  pieces[0][8] = "rK";
  kingLocations["r"] = [0, 8];
  pieces[7][10] = "bR";
  pieces[7][11] = "bK";
  kingLocations["b"] = [7, 11];
  pieces[10][11] = "yK";
  kingLocations["y"] = [10, 11];
  pieces[10][9] = "yQ";
  playerColors = ["r", "b", "y"]
  drawPieces();
}
*/