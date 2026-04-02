const board = document.querySelector("#game-board");
const playerScoreValue = document.querySelector("#player-score");
const enemyScoreValue = document.querySelector("#enemy-score");
const statusValue = document.querySelector("#status");
const speedLabel = document.querySelector("#speed-label");
const restartButton = document.querySelector("#restart-button");
const slowerButton = document.querySelector("#slower-button");
const fasterButton = document.querySelector("#faster-button");
const demoButton = document.querySelector("#demo-button");
const controlButtons = document.querySelectorAll("[data-direction], [data-action]");

const GRID_COLUMNS = 20;
const GRID_ROWS = 12;
const INITIAL_DIRECTION = "right";
const SPEED_STEPS = [
  { label: "Slow", tickMs: 220 },
  { label: "Normal", tickMs: 140 },
  { label: "Fast", tickMs: 90 },
];

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITES = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

let randomCursor = 0;
const seededValues = [0.12, 0.48, 0.76, 0.91, 0.34, 0.58, 0.83];
const random = () => {
  const value = seededValues[randomCursor % seededValues.length];
  randomCursor += 1;
  return value;
};

let state = createInitialState(random, GRID_COLUMNS, GRID_ROWS);
let isPaused = false;
let touchStartPoint = null;
let speedIndex = 1;
let demoMode = false;
let intervalId = startLoop();

buildBoard();
render();

window.addEventListener("keydown", (event) => {
  const direction = getDirectionFromKey(event.key);
  if (direction) {
    event.preventDefault();
    state = queueDirection(state, direction);
    if (state.status === "ready") {
      state = tickState(state, random);
      render();
    }
    return;
  }

  if (event.key === " ") {
    event.preventDefault();
    togglePause();
  }
});

restartButton.addEventListener("click", restartGame);
slowerButton.addEventListener("click", () => changeSpeed(-1));
fasterButton.addEventListener("click", () => changeSpeed(1));
demoButton.addEventListener("click", () => {
  demoMode = !demoMode;
  demoButton.textContent = demoMode ? "Demo Walls On" : "Demo Walls Off";
  render();
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    const direction = button.dataset.direction;

    if (action === "pause") {
      togglePause();
      return;
    }

    if (!direction) {
      return;
    }

    state = queueDirection(state, direction);
    if (state.status === "ready") {
      state = tickState(state, random);
    }
    render();
  });
});

board.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  if (!touch) {
    return;
  }

  touchStartPoint = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

board.addEventListener("touchend", (event) => {
  const touch = event.changedTouches[0];
  if (!touch || !touchStartPoint) {
    return;
  }

  const deltaX = touch.clientX - touchStartPoint.x;
  const deltaY = touch.clientY - touchStartPoint.y;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const threshold = 24;

  touchStartPoint = null;

  if (Math.max(absX, absY) < threshold) {
    return;
  }

  const direction = absX > absY
    ? (deltaX > 0 ? "right" : "left")
    : (deltaY > 0 ? "down" : "up");

  state = queueDirection(state, direction);
  if (state.status === "ready") {
    state = tickState(state, random);
  }
  render();
}, { passive: true });

window.addEventListener("beforeunload", () => {
  window.clearInterval(intervalId);
});

function buildBoard() {
  board.style.gridTemplateColumns = `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < GRID_COLUMNS * GRID_ROWS; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    fragment.appendChild(cell);
  }

  board.appendChild(fragment);
}

function createInitialState(random, gridColumns, gridRows) {
  const centerX = Math.floor(gridColumns / 2);
  const centerY = Math.floor(gridRows / 2);
  const playerSnake = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY },
  ];
  const enemySnake = [
    { x: centerX, y: centerY - 3 },
    { x: centerX - 1, y: centerY - 3 },
    { x: centerX - 2, y: centerY - 3 },
  ];
  const occupied = [...playerSnake, ...enemySnake];

  return {
    gridColumns,
    gridRows,
    snake: playerSnake,
    enemySnake,
    direction: INITIAL_DIRECTION,
    pendingDirection: INITIAL_DIRECTION,
    enemyDirection: "right",
    food: spawnFood(occupied, random, gridColumns, gridRows),
    score: 0,
    enemyScore: 0,
    status: "ready",
  };
}

function queueDirection(state, nextDirection) {
  if (!DIRECTION_VECTORS[nextDirection]) {
    return state;
  }

  if (OPPOSITES[state.direction] === nextDirection && state.snake.length > 1) {
    return state;
  }

  return {
    ...state,
    pendingDirection: nextDirection,
  };
}

function tickState(state, random) {
  if (state.status === "game-over") {
    return state;
  }

  const direction = getNextDirection(state.direction, state.pendingDirection);
  const enemyDirection = chooseEnemyDirection(state);
  const playerMovedHead = movePoint(state.snake[0], direction);
  const enemyMovedHead = movePoint(state.enemySnake[0], enemyDirection);
  const playerHead = demoMode ? wrapPoint(playerMovedHead, state.gridColumns, state.gridRows) : playerMovedHead;
  const enemyHead = demoMode ? wrapPoint(enemyMovedHead, state.gridColumns, state.gridRows) : enemyMovedHead;
  const playerAteFood = pointsEqual(playerHead, state.food);
  const enemyAteFood = !playerAteFood && pointsEqual(enemyHead, state.food);
  const playerBody = playerAteFood ? state.snake : state.snake.slice(0, -1);
  const enemyBody = enemyAteFood ? state.enemySnake : state.enemySnake.slice(0, -1);
  const playerCrash = (!demoMode && hitsBoundary(playerHead, state.gridColumns, state.gridRows))
    || hitsSnake(playerHead, playerBody)
    || hitsSnake(playerHead, enemyBody)
    || pointsEqual(playerHead, enemyHead);
  const enemyCrash = (!demoMode && hitsBoundary(enemyHead, state.gridColumns, state.gridRows))
    || hitsSnake(enemyHead, enemyBody)
    || hitsSnake(enemyHead, playerBody)
    || pointsEqual(enemyHead, playerHead);

  if (playerCrash || enemyCrash) {
    return {
      ...state,
      direction,
      pendingDirection: direction,
      enemyDirection,
      status: "game-over",
    };
  }

  const nextSnake = [playerHead, ...state.snake];
  const nextEnemySnake = [enemyHead, ...state.enemySnake];

  if (!playerAteFood) {
    nextSnake.pop();
  }

  if (!enemyAteFood) {
    nextEnemySnake.pop();
  }

  const occupied = [...nextSnake, ...nextEnemySnake];
  const nextFood = playerAteFood || enemyAteFood
    ? spawnFood(occupied, random, state.gridColumns, state.gridRows)
    : state.food;

  return {
    ...state,
    snake: nextSnake,
    enemySnake: nextEnemySnake,
    direction,
    pendingDirection: direction,
    enemyDirection,
    food: nextFood,
    score: playerAteFood ? state.score + 1 : state.score,
    enemyScore: enemyAteFood ? state.enemyScore + 1 : state.enemyScore,
    status: "running",
  };
}

function spawnFood(snake, random, gridColumns, gridRows) {
  const occupied = new Set(snake.map(toKey));
  const available = [];

  for (let y = 0; y < gridRows; y += 1) {
    for (let x = 0; x < gridColumns; x += 1) {
      const point = { x, y };
      if (!occupied.has(toKey(point))) {
        available.push(point);
      }
    }
  }

  if (available.length === 0) {
    return snake[0];
  }

  const index = Math.floor(random() * available.length);
  return available[index];
}

function getDirectionFromKey(key) {
  const normalized = key.toLowerCase();
  if (normalized === "arrowup" || normalized === "w") return "up";
  if (normalized === "arrowdown" || normalized === "s") return "down";
  if (normalized === "arrowleft" || normalized === "a") return "left";
  if (normalized === "arrowright" || normalized === "d") return "right";
  return null;
}

function render() {
  const cells = board.children;

  for (const cell of cells) {
    cell.className = "cell";
  }

  const head = state.snake[0];
  state.snake.forEach((segment, index) => {
    const cell = cells[toIndex(segment)];
    if (!cell) {
      return;
    }

    cell.classList.add("snake");
    if (index === 0) {
      cell.classList.add("head");
    }
  });

  state.enemySnake.forEach((segment, index) => {
    const cell = cells[toIndex(segment)];
    if (!cell) {
      return;
    }

    cell.classList.add("enemy");
    if (index === 0) {
      cell.classList.add("enemy-head");
    }
  });

  const foodCell = cells[toIndex(state.food)];
  if (foodCell) {
    foodCell.classList.add("food");
  }

  playerScoreValue.textContent = String(state.score);
  enemyScoreValue.textContent = String(state.enemyScore);
  statusValue.textContent = getStatusLabel();
  speedLabel.textContent = SPEED_STEPS[speedIndex].label;
  slowerButton.disabled = speedIndex === 0;
  fasterButton.disabled = speedIndex === SPEED_STEPS.length - 1;
  demoButton.setAttribute("aria-pressed", String(demoMode));
  board.setAttribute("aria-label", `Snake board. Head at ${head.x + 1}, ${head.y + 1}.`);
}

function getStatusLabel() {
  if (state.status === "game-over") {
    return "Game over";
  }

  if (isPaused) {
    return "Paused";
  }

  if (state.status === "ready") {
    return "Ready";
  }

  return "Running";
}

function restartGame() {
  randomCursor = 0;
  state = createInitialState(random, GRID_COLUMNS, GRID_ROWS);
  isPaused = false;
  render();
}

function togglePause() {
  if (state.status === "game-over") {
    return;
  }

  isPaused = !isPaused;
  render();
}

function changeSpeed(direction) {
  const nextIndex = Math.max(0, Math.min(SPEED_STEPS.length - 1, speedIndex + direction));
  if (nextIndex === speedIndex) {
    return;
  }

  speedIndex = nextIndex;
  restartLoop();
  render();
}

function startLoop() {
  return window.setInterval(() => {
    if (isPaused || state.status === "game-over") {
      return;
    }

    state = tickState(state, random);
    render();
  }, SPEED_STEPS[speedIndex].tickMs);
}

function restartLoop() {
  window.clearInterval(intervalId);
  intervalId = startLoop();
}

function toIndex(point) {
  return point.y * GRID_COLUMNS + point.x;
}

function getNextDirection(currentDirection, pendingDirection) {
  if (OPPOSITES[currentDirection] === pendingDirection) {
    return currentDirection;
  }

  return pendingDirection;
}

function movePoint(point, direction) {
  const vector = DIRECTION_VECTORS[direction];
  return { x: point.x + vector.x, y: point.y + vector.y };
}

function hitsBoundary(point, gridColumns, gridRows) {
  return point.x < 0 || point.y < 0 || point.x >= gridColumns || point.y >= gridRows;
}

function hitsSnake(point, snake) {
  return snake.some((segment) => pointsEqual(segment, point));
}

function pointsEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

function toKey(point) {
  return `${point.x},${point.y}`;
}

function wrapPoint(point, gridColumns, gridRows) {
  return {
    x: (point.x + gridColumns) % gridColumns,
    y: (point.y + gridRows) % gridRows,
  };
}

function chooseEnemyDirection(state) {
  const directions = ["up", "right", "down", "left"];
  const validDirections = directions
    .filter((direction) => direction !== OPPOSITES[state.enemyDirection])
    .map((direction) => ({
      direction,
      nextPoint: demoMode
        ? wrapPoint(movePoint(state.enemySnake[0], direction), state.gridColumns, state.gridRows)
        : movePoint(state.enemySnake[0], direction),
    }))
    .filter(({ nextPoint }) => {
      if (!demoMode && hitsBoundary(nextPoint, state.gridColumns, state.gridRows)) {
        return false;
      }

      return !hitsSnake(nextPoint, state.enemySnake.slice(0, -1))
        && !hitsSnake(nextPoint, state.snake);
    });

  if (validDirections.length === 0) {
    return state.enemyDirection;
  }

  validDirections.sort((a, b) => distance(a.nextPoint, state.food) - distance(b.nextPoint, state.food));
  return validDirections[0].direction;
}

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
