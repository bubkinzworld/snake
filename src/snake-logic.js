export const GRID_SIZE = 16;
export const INITIAL_DIRECTION = "right";
export const TICK_MS = 140;

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

export function createInitialState(random = Math.random, gridSize = GRID_SIZE) {
  const center = Math.floor(gridSize / 2);
  const snake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];

  return {
    gridSize,
    snake,
    direction: INITIAL_DIRECTION,
    pendingDirection: INITIAL_DIRECTION,
    food: spawnFood(snake, random, gridSize),
    score: 0,
    status: "ready",
  };
}

export function queueDirection(state, nextDirection) {
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

export function tickState(state, random = Math.random) {
  if (state.status === "game-over") {
    return state;
  }

  const direction = getNextDirection(state.direction, state.pendingDirection);
  const nextHead = movePoint(state.snake[0], direction);
  const ateFood = pointsEqual(nextHead, state.food);
  const collisionBody = ateFood ? state.snake : state.snake.slice(0, -1);

  if (hitsBoundary(nextHead, state.gridSize) || hitsSnake(nextHead, collisionBody)) {
    return {
      ...state,
      direction,
      pendingDirection: direction,
      status: "game-over",
    };
  }

  const nextSnake = [nextHead, ...state.snake];

  if (!ateFood) {
    nextSnake.pop();
  }

  return {
    ...state,
    snake: nextSnake,
    direction,
    pendingDirection: direction,
    food: ateFood ? spawnFood(nextSnake, random, state.gridSize) : state.food,
    score: ateFood ? state.score + 1 : state.score,
    status: "running",
  };
}

export function spawnFood(snake, random = Math.random, gridSize = GRID_SIZE) {
  const occupied = new Set(snake.map(toKey));
  const available = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
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

export function getDirectionFromKey(key) {
  const normalized = key.toLowerCase();
  if (normalized === "arrowup" || normalized === "w") return "up";
  if (normalized === "arrowdown" || normalized === "s") return "down";
  if (normalized === "arrowleft" || normalized === "a") return "left";
  if (normalized === "arrowright" || normalized === "d") return "right";
  return null;
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

function hitsBoundary(point, gridSize) {
  return point.x < 0 || point.y < 0 || point.x >= gridSize || point.y >= gridSize;
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
