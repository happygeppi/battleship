const N = 16;
const shipBlueprints = [
  {
    blueprint: [[1, 1, 1, 1, 1]],
    num: 4,
  },
  {
    blueprint: [[1, 1, 1, 1]],
    num: 3,
  },
  {
    blueprint: [[1, 1, 1]],
    num: 2,
  },
  {
    blueprint: [[1, 1]],
    num: 1,
  },
  {
    blueprint: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    num: 2,
  },
];

const ships = [];
const board = [];
let player;

const margin = 1; // ships must have margin spaces between them

const coldHue = 120;
const hotHue = 330;

let done = false;
let moves = 0;

let play = false;

const random = (a, b) => Math.floor(Math.random() * (b - a) + a);

function Init() {
  CreateShips();
  CreateBoardHTML();
  CreateBoardData();
  InitPlayer();
}

function Update(start = false) {
  if (start) play = true;
  player.nextMove();
  if (play) requestAnimationFrame(Update);
}

function RevealAll() {
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) board[j][i].reveal(false, false);
  player.updateHeatHTML();
}

function CreateShips() {
  for (const s of shipBlueprints)
    for (let i = 0; i < s.num; i++) ships.push(new Ship(s.blueprint));
}

function CreateBoardHTML() {
  document.documentElement.style.setProperty("--n", N);

  for (let j = 0; j < N; j++) {
    const BoardRow = document.createElement("div");
    BoardRow.classList.add("row");
    document.getElementById("board").append(BoardRow);

    const HeatMapRow = document.createElement("div");
    HeatMapRow.classList.add("row");
    document.getElementById("heatmap").append(HeatMapRow);

    board.push([]);
    for (let i = 0; i < N; i++) board[j].push(new Cell(i, j, BoardRow));
    for (let i = 0; i < N; i++) {
      const Cell = document.createElement("div");
      Cell.classList.add("cell");
      HeatMapRow.append(Cell);
    }
  }
}

function CreateBoardData(attempt = 0) {
  if (attempt > 5) return console.log("doenst fit at all");

  const numTries = 1000;
  for (const s of ships) {
    let tries = 0;

    do {
      s.build = s.rot.random();
      s.pos = { x: random(0, N), y: random(0, N) };
      tries++;
      if (tries > numTries) {
        console.log("doesnt fit");
        return CreateBoardData(attempt + 1);
      }
    } while (!LegalPlacement(s) && tries < numTries);

    s.place();
  }
}

function InitPlayer() {
  player = new Player();
}

function LegalPlacement(ship) {
  for (let j = 0; j < ship.build.length; j++) {
    for (let i = 0; i < ship.build[j].length; i++) {
      if (ship.build[j][i] == 1) {
        const x = ship.pos.x + i;
        const y = ship.pos.y + j;
        if (x >= N || y >= N) return false;

        for (let dy = -margin; dy <= margin; dy++)
          for (let dx = -margin; dx <= margin; dx++)
            if (x + dx >= 0 && x + dx < N && y + dy >= 0 && y + dy < N)
              if (board[y + dy][x + dx].value == 1) return false;
      }
    }
  }

  return true;
}

function CheckWin() {
  for (const s of ships) if (!s.sunk) return false;

  done = true;
  RevealAll();
  console.log("done in" , moves, "moves");
}

class Ship {
  constructor(blueprint) {
    this.build = blueprint;
    this.sunk = false;
    this.rot = this.getOrientations();
    this.pos = { x: null, y: null };
  }

  getOrientations() {
    const rots = [
      this.build,
      this.build.rotate(),
      this.build.rotate().rotate(),
      this.build.rotate().rotate().rotate(),
    ];

    for (let i = 0; i < 4; i++) {
      rots.push(rots[i].flipX());
      rots.push(rots[i].flipY());
      rots.push(rots[i].flipX().flipY());
    }

    const uniqueRots = [];

    for (let rot = 0; rot < rots.length; rot++) {
      let unique = true;
      for (let other = rot + 1; other < rots.length; other++)
        if (rots[rot].sameAs(rots[other])) unique = false;
      if (unique) uniqueRots.push(rots[rot]);
    }

    return uniqueRots;
  }

  place() {
    for (let j = 0; j < this.build.length; j++) {
      for (let i = 0; i < this.build[j].length; i++) {
        const x = this.pos.x + i;
        const y = this.pos.y + j;
        if (this.build[j][i] == 1) {
          board[y][x].value = 1;
          board[y][x].ship = this;
        }
      }
    }
  }

  checkSunk() {
    if (!this.allCellsHit()) return false;

    this.sunk = true;
    for (let j = 0; j < this.build.length; j++)
      for (let i = 0; i < this.build[j].length; i++)
        if (this.build[j][i] == 1)
          board[this.pos.y + j][this.pos.x + i].html.classList.add("sunk");
    return true;
  }

  allCellsHit() {
    for (let j = 0; j < this.build.length; j++)
      for (let i = 0; i < this.build[j].length; i++)
        if (this.build[j][i] == 1)
          if (!board[this.pos.y + j][this.pos.x + i].hit) return false;
    return true;
  }
}

class Cell {
  constructor(i, j, Row) {
    this.i = i;
    this.j = j;
    this.hit = false;
    this.revealed = false;
    this.value = 0;

    this.createHTML(Row);
  }

  createHTML(Row) {
    this.html = document.createElement("div");
    this.html.classList.add("cell");
    Row.append(this.html);

    this.html.addEventListener("click", () => this.reveal(true));
  }

  reveal(byHand = false, updateHeatMap = true) {
    if (this.revealed) return;
    this.revealed = true;

    if (this.value == 0) this.html.classList.add("miss");
    else {
      this.html.classList.add("hit");
      this.hit = true;
      if (this.ship.checkSunk()) CheckWin();
    }

    if (byHand) player.nextMove(this.i, this.j, updateHeatMap);
  }
}

class Player {
  constructor() {
    this.heatMap = [];
    this.ship = [];
    this.updateHeatHTML();
  }

  clearHeatMap() {
    this.heatMap = [];
    for (let j = 0; j < N; j++) {
      this.heatMap.push([]);
      for (let i = 0; i < N; i++) this.heatMap[j][i] = 0;
    }
  }

  updateHeatMap() {
    this.clearHeatMap();

    for (const s of ships)
      if (!s.sunk) for (const build of s.rot) this.updateHeatFor(build);
  }

  updateHeatFor(build) {
    for (let y = 0; y <= N - build.length; y++)
      for (let x = 0; x <= N - build[0].length; x++)
        if (this.fits(build, x, y)) {
          if (this.ship.length > 0) {
            if (this.fitsHunt(build, x, y)) this.updateHeatAt(build, x, y);
          } else this.updateHeatAt(build, x, y);
        }
  }

  fits(build, x, y) {
    for (let j = 0; j < build.length; j++) {
      for (let i = 0; i < build[j].length; i++) {
        if (build[j][i] == 1) {
          const cell = board[y + j][x + i];
          if (cell.revealed && cell.value == 0) return false;
          if (cell.value == 1 && cell.ship.sunk) return false;

          for (let dy = -margin; dy <= margin; dy++)
            for (let dx = -margin; dx <= margin; dx++) {
              const tempX = x + i + dx;
              const tempY = y + j + dy;
              if (tempX >= 0 && tempX < N && tempY >= 0 && tempY < N) {
                const tempCell = board[tempY][tempX];
                let inShip = false;
                for (const coord of this.ship)
                  if (tempX == coord.x && tempY == coord.y) inShip = true;

                if (
                  tempCell.revealed &&
                  tempCell.value == 1 &&
                  dx != 0 &&
                  dy != 0 &&
                  !inShip
                )
                  return false;
              }
            }
        }
      }
    }

    return true;
  }

  fitsHunt(build, x, y) {
    for (const coord of this.ship) {
      let inBuild = false;
      for (let j = 0; j < build.length; j++)
        for (let i = 0; i < build[j].length; i++)
          if (build[j][i] == 1) {
            if (x + i == coord.x && y + j == coord.y) inBuild = true;
          }
      if (!inBuild) return false;
    }
    return true;
  }

  updateHeatAt(build, x, y) {
    for (let j = 0; j < build.length; j++)
      for (let i = 0; i < build[j].length; i++) {
        let inShip = false;
        for (const coord of this.ship)
          if (y + j == coord.y && x + i == coord.x) inShip = true;
        if (build[j][i] == 1 && !inShip) {
          this.heatMap[y + j][x + i]++;
        }
      }
  }

  findHottestSpot() {
    let hottestValue = -1;
    let hottestSpot = null;
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++)
        if (this.heatMap[j][i] > hottestValue) {
          hottestValue = this.heatMap[j][i];
          hottestSpot = { j, i };
        }
    return hottestSpot;
  }

  findHottestCell() {
    const spot = this.findHottestSpot();
    return board[spot.j][spot.i];
  }

  nextMove(i = null, j = null, updateHeatMap = true) {
    let cell;
    if (i == null) {
      this.updateHeatMap();
      cell = this.findHottestCell();
      cell.reveal();
    } else cell = board[j][i];

    if (cell.value == 1) this.ship.push({ x: cell.i, y: cell.j });
    if (this.ship.length > 0 && board[this.ship[0].y][this.ship[0].x].ship.sunk)
      this.ship = [];

    if (updateHeatMap) this.updateHeatHTML();

    if (!done) moves++;
  }

  updateHeatHTML() {
    this.updateHeatMap();
    const spot = this.findHottestSpot();
    const maxHeat = this.heatMap[spot.j][spot.i];
    const Cells = document.querySelectorAll("#heatmap .cell");
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const index = j * N + i;
        const hue = this.heatMap[j][i].map(0, maxHeat, coldHue, hotHue);
        Cells[index].style.setProperty("--hue", hue);
      }
  }
}

Array.prototype.rotate = function () {
  const numRows = this.length; // rows of this (= cols of rotated)
  const numCols = this[0].length; // cols of this (= rows of rotated)

  const rotated = [];

  for (let j = 0; j < numCols; j++) {
    rotated.push([]);
    for (let i = 0; i < numRows; i++) rotated[j].unshift(this[i][j]);
  }

  return rotated;
};
Array.prototype.flipX = function () {
  const flipped = [];

  for (let i = 0; i < this.length; i++) {
    flipped[i] = this[this.length - i - 1].slice();
  }

  return flipped;
};
Array.prototype.flipY = function () {
  const flipped = [];

  for (let i = 0; i < this.length; i++) {
    flipped.push([]);

    for (let j = 0; j < this[i].length; j++)
      flipped[i][j] = this[i][this[i].length - j - 1];
  }

  return flipped;
};

Array.prototype.sameAs = function (arr2d) {
  if (this.length != arr2d.length) return false;

  for (let i = 0; i < this.length; i++) {
    if (this[i].length != arr2d[i].length) return false;

    for (let j = 0; j < this[i].length; j++)
      if (this[i][j] != arr2d[i][j]) return false;
  }

  return true;
};

Array.prototype.random = function () {
  return this[Math.floor(Math.random() * this.length)];
};

Number.prototype.map = function (inA, inB, outA, outB) {
  return outA + ((this - inA) * (outB - outA)) / (inB - inA);
};

document.addEventListener("keypress", (e) => {
  if (e.key == "x") player.nextMove();
  if (e.key == "a") RevealAll();
  if (e.key == " ") {
    if (play) play = false;
    else Update(true);
  }
});

Init();
