import assert from "node:assert/strict";
import {
  createInitialState,
  queueDirection,
  spawnFood,
  tickState,
} from "../src/snake-logic.js";

function run() {
  testSnakeMovesForward();
  testSnakeGrowsAfterFood();
  testBoundaryCollisionEndsGame();
  testOppositeDirectionIsIgnored();
  testFoodAvoidsSnakeBody();
  console.log("All snake logic tests passed.");
}

function testSnakeMovesForward() {
  const state = createInitialState(() => 0, 8);
  const next = tickState(state, () => 0);
  assert.deepEqual(next.snake[0], { x: 5, y: 4 });
  assert.equal(next.score, 0);
}

function testSnakeGrowsAfterFood() {
  const state = {
    ...createInitialState(() => 0, 8),
    food: { x: 5, y: 4 },
    status: "running",
  };
  const next = tickState(state, () => 0);
  assert.equal(next.score, 1);
  assert.equal(next.snake.length, 4);
  assert.notDeepEqual(next.food, next.snake[0]);
}

function testBoundaryCollisionEndsGame() {
  const state = {
    gridSize: 4,
    snake: [{ x: 3, y: 0 }],
    direction: "right",
    pendingDirection: "right",
    food: { x: 1, y: 1 },
    score: 0,
    status: "running",
  };
  const next = tickState(state, () => 0);
  assert.equal(next.status, "game-over");
}

function testOppositeDirectionIsIgnored() {
  const state = createInitialState(() => 0, 8);
  const queued = queueDirection(state, "left");
  assert.equal(queued.pendingDirection, "right");
}

function testFoodAvoidsSnakeBody() {
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ];
  const food = spawnFood(snake, () => 0, 2);
  assert.deepEqual(food, { x: 1, y: 1 });
}

run();
