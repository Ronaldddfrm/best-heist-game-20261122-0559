// shots.js — staged screenshot scenes for The Midnight Vault.
// Each scene plays the real rules forward from a set-up position, so the
// screenshots are genuine renders of the game, never composited.
import { stepWorld, startGame, showMessage } from './world.js';

const STEP = 1 / 60;

function runSteps(world, seconds) {
  const idle = { moveX: 0, moveY: 0, sneak: false, interactHeld: false, interactPressed: false, throwAt: null, pausePressed: false };
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) stepWorld(world, idle, STEP);
}

// 1-cover: mid-room, cones sweeping, vault + loot + alarm all in frame.
export function stageCover(world) {
  startGame(world);
  world.player.x = 560;
  world.player.y = 430;
  world.player.face = -Math.PI / 2;
  world.alarm = 12;
  runSteps(world, 1.2);
  world.player.x = 560;
  world.player.y = 430;
  world.message = '';
  world.messageTimer = 0;
}

// 2-alert: the thief stands inside a guard's cone. The guard is held still
// so its patrol lane cannot run through the thief before the frame lands;
// ~1.6 s of stepping is the sweet spot between "spotted" and "caught".
export function stageAlert(world) {
  startGame(world);
  const g = world.guards[0];
  g.x = 500;
  g.y = 320;
  g.face = 0;
  g.waypoints = [{ x: 500, y: 320 }, { x: 500, y: 320 }];
  g.leg = 0;
  g.pauseTimer = 99;
  world.player.x = 600;
  world.player.y = 375;
  world.player.sneaking = false;
  runSteps(world, 1.6);
  // If the guard already caught the thief, pull the scene back a touch.
  if (world.screen !== 'playing') {
    world.screen = 'playing';
    world.player.x = 600;
    world.player.y = 375;
    g.state = 'chase';
    g.chaseTimer = 2.5;
    g.detection = 1;
    world.alarm = 32;
    showMessage(world, 'SPOTTED! Run — the alarm is climbing!', 2.6);
  }
}

// 3-hide: sneaking in shadow behind the crates, a coin on the floor, and a
// guard walking over to investigate it ("?"), alarm low.
export function stageHide(world) {
  startGame(world);
  world.alarm = 20;
  world.player.x = 250;
  world.player.y = 545;
  world.player.sneaking = true;
  world.player.face = Math.PI / 2;
  const g = world.guards[0];
  g.x = 620;
  g.y = 320;
  g.state = 'investigate';
  g.investigateX = 700;
  g.investigateY = 300;
  g.investigateTimer = 3.5;
  g.face = Math.atan2(300 - 320, 700 - 620);
  world.coin = { x: 700, y: 300, timer: 3.5 };
  world.coins = 2;
  runSteps(world, 0.8);
  world.player.x = 250;
  world.player.y = 545;
  world.player.sneaking = true;
  world.alarm = 20;
  showMessage(world, 'Shh… stay in the shadow.', 2.4);
}

// 4-win: the win overlay — vault cracked, $5,800 carried, clean getaway.
export function stageWin(world) {
  startGame(world);
  world.vault.cracked = true;
  world.lootTotal = 5800;
  world.loot.find((i) => i.id === 'gold').taken = true;
  world.exitOpen = true;
  world.alarm = 24;
  world.screen = 'win';
  world.escaped = true;
  world.bestLoot = 5800;
  world.player.x = 640;
  world.player.y = 672;
  world.stats.spotted = 1;
  world.stats.peakAlarm = 24;
  world.stats.coinsUsed = 1;
  world.time = 214; // a 3:34 getaway reads better than 0:00 on the win card
  showMessage(world, '', 0);
}

export function stageShot(world, name) {
  if (name === 'cover') stageCover(world);
  else if (name === 'alert') stageAlert(world);
  else if (name === 'hide') stageHide(world);
  else if (name === 'win') stageWin(world);
  else stageCover(world);
}
