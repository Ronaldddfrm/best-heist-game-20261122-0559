// main.js — fixed-step loop + ?shot= mode for The Midnight Vault.
// Owns the canvas, the input handoff, the sound cues and the debug hooks
// (window.__game) the play-test driver reads.
import { createWorld, stepWorld, stepAttract, startGame } from './world.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'midnight-vault-best-loot';
const STEP = 1 / 60;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas, (x, y) => renderer.toField(x, y));

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shotName = params.get('shot');

const world = createWorld(seed);
try {
  const saved = Number(window.localStorage.getItem(BEST_KEY) || '0');
  if (Number.isFinite(saved) && saved > 0) world.bestLoot = saved;
} catch {
  // Private mode or no storage: the game plays on without a best score.
}

function saveBest() {
  try {
    window.localStorage.setItem(BEST_KEY, String(world.bestLoot));
  } catch {
    // Best loot is a nicety, never a crash.
  }
}

function playEventSounds() {
  for (const event of world.events) {
    if (event === 'grab') audio.grab();
    else if (event === 'smash') audio.smash();
    else if (event === 'coin') audio.coin();
    else if (event === 'spotted') audio.spotted();
    else if (event === 'vault') audio.vault();
    else if (event === 'exit-open') audio.exitOpen();
    else if (event === 'win') { audio.win(); saveBest(); }
    else if (event === 'caught') { audio.caught(); saveBest(); }
  }
  world.events.length = 0;
}

function describeState() {
  return {
    screen: world.screen,
    time: Math.round(world.time * 10) / 10,
    player: { x: Math.round(world.player.x), y: Math.round(world.player.y) },
    alarm: Math.round(world.alarm * 10) / 10,
    loot: world.lootTotal,
    coins: world.coins,
    vaultCracked: world.vault.cracked,
    exitOpen: world.exitOpen,
    escaped: world.escaped,
    bestLoot: world.bestLoot,
    guards: world.guards.map((g) => ({
      x: Math.round(g.x),
      y: Math.round(g.y),
      state: g.state,
      detection: Math.round(g.detection * 100) / 100,
    })),
  };
}

function announce() {
  if (!statusEl) return;
  const s = describeState();
  statusEl.textContent = `The Midnight Vault: ${s.screen}, loot $${s.loot}, alarm ${Math.round(s.alarm)} percent, ${s.coins} coins left.`;
}

// Debug + driver hooks. The play-test reads state() and pokes at S.
window.__game = { state: describeState, S: world };

function frameActions() {
  const actions = input.takeActions(world.player);
  audio.unlock();
  if (actions.startPressed || actions.clicked) {
    if (world.screen === 'title' || world.screen === 'caught' || world.screen === 'win') {
      startGame(world);
      return null;
    }
  }
  if (actions.pausePressed) {
    if (world.screen === 'playing') world.screen = 'paused';
    else if (world.screen === 'paused') world.screen = 'playing';
    return null;
  }
  if (world.screen === 'playing') return actions;
  return null;
}

if (shotName) {
  // Screenshot mode: stage the scene, paint twice, signal readiness.
  stageShot(world, shotName);
  renderer.render(world);
  renderer.render(world);
  announce();
  window.__shotReady = true;
} else {
  let last = performance.now();
  let accumulator = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const elapsed = Math.min((now - last) / 1000, 0.25);
    last = now;
    accumulator += elapsed;
    // Take input only when a simulation step is about to run: one-shot
    // flags (E taps, throws, clicks) then survive until a step uses them
    // instead of being cleared on a frame that never steps.
    const actions = accumulator >= STEP ? frameActions() : null;
    let firstStep = true;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      if (world.screen === 'title') {
        stepAttract(world, STEP);
      } else if (actions) {
        stepWorld(world, actions, STEP);
        // One-shot flags belong to the first step only, never to a catch-up step.
        if (firstStep) { actions.interactPressed = false; actions.throwAt = null; }
        firstStep = false;
      }
    }
    playEventSounds();
    renderer.render(world);
    announce();
  }
  requestAnimationFrame(loop);
}
