const startingPos = {
  pieces: [
    ["wL", "wL", "wL", "yR", "yN", "yB", "yK", "yQ", "yB", "yN", "yR", "wL", "wL", "wL"],
    ["wL", "wL", "wL", "yP", "yP", "yP", "yP", "yP", "yP", "yP", "yP", "wL", "wL", "wL"],
    ["wL", "wL", "wL", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wL", "wL", "wL"],
    ["bR", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gR"],
    ["bN", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gN"],
    ["bB", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gB"],
    ["bK", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gQ"],
    ["bQ", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gK"],
    ["bB", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gB"],
    ["bN", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gN"],
    ["bR", "bP", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "gP", "gR"],
    ["wL", "wL", "wL", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wW", "wL", "wL", "wL"],
    ["wL", "wL", "wL", "rP", "rP", "rP", "rP", "rP", "rP", "rP", "rP", "wL", "wL", "wL"],
    ["wL", "wL", "wL", "rR", "rN", "rB", "rQ", "rK", "rB", "rN", "rR", "wL", "wL", "wL"],
  ],
  kingLocations: { r: [13, 7], b: [6, 0], y: [0, 6], g: [7, 13] },
  castlingRights: {
    r: [true, true],
    b: [true, true],
    y: [true, true],
    g: [true, true],
  },
  playerPts: {
    r: 0,
    b: 0,
    y: 0,
    g: 0,
  },
  ep: {
    r: null,
    b: null,
    y: null,
    g: null
  },
  playerColors: ["r", "b", "y", "g"],
  colorToMove: "r",
  moves: [],
  boardHistory: [],
  doublePawnMoves: {},
  deadKings: 0,
  fiftyRule: 0,
  gameMode: 1,
  state: null,
  usersInGame: { r: null, b: null, y: null, g: null },
  teamWin: null,
  log: "",
}

let disconnectClock = {
  r: null,
  b: null,
  y: null,
  g: null
};
let allColorNames = ["red", "blue", "yellow", "green"];

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const allColors = ["r", "b", "y", "g"];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow connections from any frontend port
    methods: ["GET", "POST"]
  }
});

/*vars*/
let game;

let legalMoves;
const dir = [[-1, 0], [0, 1], [1, 0], [0, -1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
const Nmoves = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];

function newGame() {
  game = JSON.parse(JSON.stringify(startingPos));
  io.emit("updateClients", game);
}

/* server */

newGame();

io.on("connection", (socket) => {
  let acolor;

  console.log("A player connected:", socket.id);
  for (let i = 0; i < 4; i++) {
    if (game.usersInGame[allColors[i]] === null) {
      acolor = allColors[i];
      game.usersInGame[allColors[i]] = socket.id;
      break;
    }
  }
  if (acolor && disconnectClock[acolor]) {
    clearTimeout(disconnectClock[acolor]);
    disconnectClock[acolor] = null;
  }

  io.emit("updateUsers", {
    users: game.usersInGame,
    id: socket.id,
    pos: game
  });

  socket.on("move", (move) => {
    const { fy, fx, ty, tx, special } = move;
    const pcolor = Object.keys(game.usersInGame).find(c => game.usersInGame[c] === socket.id);
    if (game.colorToMove === pcolor) {
      if (tryMove(fy, fx, ty, tx, false, game.colorToMove, special)) {
        io.emit("updateClients", game);
      }

    }
  });

  socket.on("res", (data) => {
    game.deadKings++;
    nextMove(data);
    kill(game.playerColors.indexOf(data), "res");

    io.emit("updateClients", game);
  });

  socket.on("disconnect", () => {
    let pcolor = null;

    for (const c in game.usersInGame) {
      if (game.usersInGame[c] === socket.id) {
        game.usersInGame[c] = null;
        pcolor = c;
        break;
      }
    }

    sendInChat(`${allColorNames[allColors.indexOf(pcolor)]} has disconnected`)

    if (pcolor) {
      disconnectClock[pcolor] = setTimeout(() => {
        console.log(pcolor + " timed out");

        if (game.usersInGame[pcolor] !== null) return;

        const index = game.playerColors.indexOf(pcolor);
        if (index !== -1) {
          kill(index, "res");
          sendInChat(`${allColorNames[allColors.indexOf(pcolor)]} did not reconnect in time :)`);
        }

        io.emit("updateClients", game);
      }, 60000);
    }

    if (Object.values(game.usersInGame).every(d => d === null)) {
      newGame();
    } else {
      io.emit("updateUsers", { users: game.usersInGame, id: socket.id, pos: game });
    }
  });

  socket.on("chatMessage", (data) => {
    sendInChat(data);
  });

  socket.on("newGame", () => {
    console.log("r")
    newGame();
  });
});

function sendInChat(txt) {
  game.log += "\n" + txt;
  io.emit("chatMessage", game.log);
}


const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

function updateHistory() {
  game.boardHistory.push(JSON.stringify({
    board: game.pieces,
    turn: game.colorToMove,
    castling: game.castlingRights,
    ep: game.doublePawnMoves,
    pts: game.playerPts,
    players: game.playerColors
  }));
}

function nextMove(turn, moveData) {
  let indexx = game.playerColors.indexOf(turn);
  game.colorToMove = game.playerColors[(indexx + 1) % game.playerColors.length];
  updateHistory();

  game.fiftyRule++;
  if (game.fiftyRule >= 200) {
    game.teamWin = "draw";
    endGame(game.gameMode, "fif");
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
      game.teamWin = "draw";
      //endGame(game.gameMode, "rep")
    }
  }
}

function endGame(mode, type = "mate") {
  let typeEnd = {
    mate: game.gameMode === 2 ? "checkmate" : "last player remaining",
    res: "resignation or flag",
    stale: "stale mate",
    fif: "fifty-move rule",
    rep: "threefold repitition"
  }

  game.gameState = "finished";

  if (type === "mate" || type === "res") {
    for (let i = 0; i < game.deadKings; i++) {
      game.playerPts[Object.values(game.playerColors)] += 20;
    }
  } else if (type === "fif" || type === "rep") {
    for (let i = 0; i < game.playerColors.length; i++) {
      game.playerPts[game.playerColors[i]] += 10;
    }
  }

  const ptsSort = Object.entries(game.playerPts).sort((a, b) => b[1] - a[1]);
  let pointsLB = [];
  let j = 0;
  let results;
  if (mode !== 2) {
    for (let i = 0; i <= 3; i++) {
      if (game.gameMode === 3) {

      } else {

      }

      const rank = ["1st", "2nd", "3rd", "4th"];
      pointsLB.push([ptsSort[i][0], rank[j]]);
      if (i === 3 || (ptsSort[i][1] !== ptsSort[i + 1][1])) {
        j++;
      }
    }


    results = `${pointsLB[0][0]}: ${pointsLB[0][1]}\n${pointsLB[1][0]}: ${pointsLB[1][1]}\n${pointsLB[2][0]}: ${pointsLB[2][1]}\n${pointsLB[3][0]}: ${pointsLB[3][1]}`;

  } else {
    if (game.teamWin === "draw") {
      results = "Bruh draw >:(";
    } else {
      results = game.teamWin + " wins";
    }
  }


  sendInChat(`\n\nGame Over\n${results}`);
  io.emit("endGame", results);
}


function tryMove(fy, fx, ty, tx, test, pcolor, special) {
  //gonna change
  const argumentz = { fy, fx, ty, tx, test, pcolor };
  const dirx = dir[allColors.indexOf(pcolor)][1];
  const diry = dir[allColors.indexOf(pcolor)][0];
  if (test) {
    oldBoard = game.pieces.map((r) => r.slice());
    oldKingLocations = game.kingLocations[pcolor].slice();
  }
  let turn;
  let enPassant;
  let isCastle = false;
  let didMove = false;
  isP = false;
  moveSquare = game.pieces[ty][tx]
  const captured = moveSquare;
  piece = game.pieces[fy][fx];
  getLegalMoves(fx, fy, piece[1], piece[0]);
  if (moveSquare[0] !== piece[0] && !(moveSquare[0] === game.playerColors[((game.playerColors.indexOf(piece[0])) + 2) % 4] && game.gameMode === 2)) {
    if ((fx !== tx) || (fy !== ty)) {
      if ((moveSquare[0] !== piece[0])) {
        if (legalMoves.some(m => m.x === tx && m.y === ty)) {
          let legalSquares = legalMoves.map((m) => `${m.y},${m.x}`);
          let moveIndex = legalSquares.indexOf(`${ty},${tx}`);
          const dirx = dir[allColors.indexOf(game.colorToMove)][1];
          const diry = dir[allColors.indexOf(game.colorToMove)][0];
          //checkPromoting(ty, tx);

          if (piece[1] === "P" && special) {
            const pieceColor = piece[0];
            let isPromoting = false;
            if (pieceColor === "r") {
              if (ty === 6) { isPromoting = true; }
            } else if (pieceColor === "y") {
              if (ty === 7) { isPromoting = true; }
            } else if (pieceColor === "b") {
              if (tx === 7) { isPromoting = true; }
            } else if (pieceColor === "g") {
              if (tx === 6) { isPromoting = true; }
            }
            if (isPromoting) {
              if (!"QRBN".includes(special) || special === "") { special = "Q"; }
              piece = piece[0] + special;
            }
            isP = isPromoting;
          }

          game.pieces[ty][tx] = piece;
          game.pieces[fy][fx] = "wW";
          if (!test) {
            if (piece[1] === "P" && legalMoves[moveIndex]?.specialMove === "double") {
              game.doublePawnMoves[pcolor] = `${fy + diry},${fx + dirx}`;
            } else {
              game.doublePawnMoves[pcolor] = null;
            }
            if (piece[1] === "P" && legalMoves[moveIndex]?.specialMove === "ep") {
              let epColor = null;
              let epDirx, epDiry;
              for (let c of allColors) {
                if (game.doublePawnMoves[c] === `${ty},${tx}`) {
                  epColor = c;
                  epDirx = dir[allColors.indexOf(epColor)][1];
                  epDiry = dir[allColors.indexOf(epColor)][0];
                  break;
                }
              }
              game.pieces[ty + epDiry][tx + epDirx] = "wW";
            } else {
            }
            if (piece[1] === "P") {
              game.fiftyRule = -1;
            }
          }
          if (piece[1] === "K") {
            if (!test) { game.castlingRights[piece[0]] = [false, false]; }
            if (legalMoves[moveIndex]?.specialMove === "O-O") {
              game.pieces[fy - dirx * 3][fx - diry * 3] = "wW";
              game.pieces[fy - dirx][fx - diry] = game.colorToMove + "R";
              if (!test) { isCastle = true; }
            }
            if (legalMoves[moveIndex]?.specialMove === "O-O-O") {
              game.pieces[fy + dirx * 4][fx + diry * 4] = "wW";
              game.pieces[fy + dirx][fx + diry] = game.colorToMove + "R";
              if (!test) { isCastle = true; }
            }
            game.kingLocations[pcolor][0] = ty;
            game.kingLocations[pcolor][1] = tx;
          }
          if (piece[1] === "R") {
            let queensideR = [[13, 3], [10, 0], [0, 10], [3, 13]];
            let kingsideR = [[13, 10], [3, 0], [0, 3], [10, 13]];
            if (kingsideR.some(([y, x]) => y === fy && x === fx)) {
              if (!test) { game.castlingRights[piece[0]][0] = false; }
            }
            if (queensideR.some(([y, x]) => y === fy && x === fx)) {
              if (!test) { game.castlingRights[piece[0]][1] = false; }
            }
          }
          if (moveSquare[0] !== "w" && !test) {
            if ([1, 3].includes(game.gameMode)) {
              const pieceType = moveSquare[1];
              const pieceVal = { P: 1, N: 3, B: 5, R: 5, Q: 9, K: 20 }
              if (moveSquare[0] !== "d" || moveSquare.length === 3) {
                game.playerPts[game.colorToMove] += pieceVal[pieceType];
                if (pieceType === "K") {
                  game.playerColors.splice(game.playerColors.indexOf(moveSquare[0]), 1);
                  if (moveSquare[0] === "d"){
                    game.deadKings--;
                  }
                }
              }
            }
            game.fiftyRule = -1;
          }
          if (!test) { didMove = true; legalMoves = []; turn = game.colorToMove; }
        }
      }
    }
  }
  if (!test) {
    if (captured[1] === "R") {
      let queensideR = [[13, 3], [10, 0], [0, 10], [3, 13]];
      let kingsideR = [[13, 10], [3, 0], [0, 3], [10, 13]];
      if (kingsideR.some(([y, x]) => y === ty && x === tx)) {
        game.castlingRights[captured[0]][0] = false;
      }
      if (queensideR.some(([y, x]) => y === ty && x === tx)) {
        game.castlingRights[captured[0]][1] = false;
      }
    }
    game.moves.push({ fx: fx, fy: fy, tx: tx, ty: ty, piece: piece, captured: moveSquare, isPromoting: isP, isCastle: isCastle, ep: enPassant, });
    if (game.gameMode !== 2) {
      let jc;
      for (let j = 0; j < game.playerColors.length; j++) {
        jc = game.playerColors[j];
        if (!existsLegalMove(jc)) {
          if (isKingInCheck(jc, game.kingLocations[jc][0], game.kingLocations[jc][1])) {
            game.playerPts[turn] += 20;
            kill(j);
          }
        }
        legalMoves = [];
      }
    } else {
      legalMoves = [];
    }

    if (didMove) {
      nextMove(turn, { fy, fx, ty, tx, pcolor, special }, true);
    }
    if (game.gameMode !== 2) {

      if (!existsLegalMove(game.colorToMove)) {
        if (1) {
          if (!isKingInCheck(game.colorToMove, game.kingLocations[game.colorToMove][0], game.kingLocations[game.colorToMove][1])) {
            game.playerPts[game.colorToMove] += 20;
            kill(game.playerColors.indexOf(game.colorToMove));
          }
        }
      }
      legalMoves = [];
    } else {

      if (!existsLegalMove(game.colorToMove)) {
        if (1) {
          if (isKingInCheck(game.colorToMove, game.kingLocations[game.colorToMove][0], game.kingLocations[game.colorToMove][1])) {
            kill(game.playerColors.indexOf(game.colorToMove));
          } else {
            kill(game.playerColors.indexOf(game.colorToMove), "stale");
          }
        }
      }
      legalMoves = [];
    }
  }
  return didMove;
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
  let realKy, realKx;
  const backupBoard = game.pieces.map(r => r.slice());
  const backupKing = [...game.kingLocations[kcolor]];
  if (isTestMove) {
    const movingPiece = game.pieces[py][px];
    game.pieces[ty][tx] = movingPiece;
    game.pieces[py][px] = "wW";
    if (movingPiece[1] === "K") {
      realKy = ty;
      realKx = tx;
    }
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
    if (0) { game.pieces = oldBoard; game.kingLocations[kcolor] = oldKingLocations; }
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

function kill(p, type = "mate") {
  let pcolor = game.playerColors[p];
  game.playerColors.splice(p, 1);

  for (let y = 0; y <= 13; y++) {

    for (let x = 0; x <= 13; x++) {
      if (game.pieces[y][x][0] === pcolor) {
        game.pieces[y][x] = "d" + game.pieces[y][x][1];
        if (type === "res" && game.pieces[y][x] === "dK") {
          game.pieces[y][x] += "" + pcolor;
        }
      }
    }
  }
  if (game.gameMode === 2) {
    if (type === "stale") {
      game.teamWin = "draw";
      endGame(game.gameMode, "stale");
    } else {
      if (pcolor === "b" || pcolor === "g") {
        game.teamWin = "RY";
      } else {
        game.teamWin = "BG";
      }
      endGame(game.gameMode, type);
    }
  } else {
    if (game.playerColors.length < 2) {
      endGame(game.gameMode);
    }
  }
}