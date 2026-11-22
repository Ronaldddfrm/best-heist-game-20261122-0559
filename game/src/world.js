// world.js — the pure simulation for The Midnight Vault.
// No drawing here, no DOM: blocks, shadows, guards, cameras, loot, alarm,
// detection, line of sight and circle-vs-rectangle movement.
import {
  FIELD_W,
  FIELD_H,
  WALL,
  PLAYER,
  GUARD,
  CAMERA,
  ALARM,
  LOOT,
  COIN,
} from './config.js';

// ---------------------------------------------------------------- geometry

export function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Does segment (x1,y1)-(x2,y2) hit rectangle r? Slab test, inclusive edges.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let tA = (r.x - x1) / dx;
    let tB = (r.x + r.w - x1) / dx;
    if (tA > tB) [tA, tB] = [tB, tA];
    tMin = Math.max(tMin, tA);
    tMax = Math.min(tMax, tB);
    if (tMin > tMax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let tA = (r.y - y1) / dy;
    let tB = (r.y + r.h - y1) / dy;
    if (tA > tB) [tA, tB] = [tB, tA];
    tMin = Math.max(tMin, tA);
    tMax = Math.min(tMax, tB);
    if (tMin > tMax) return false;
  }
  return true;
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

// Push a circle out of a rectangle it overlaps. Returns true on a hit.
export function pushCircleOutOfRect(circle, r) {
  const cx = clamp(circle.x, r.x, r.x + r.w);
  const cy = clamp(circle.y, r.y, r.y + r.h);
  const dx = circle.x - cx;
  const dy = circle.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= circle.r * circle.r) return false;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    circle.x = cx + (dx / d) * circle.r;
    circle.y = cy + (dy / d) * circle.r;
  } else {
    // Centre inside the rect: shove out along the shallowest side.
    const left = circle.x - r.x;
    const right = r.x + r.w - circle.x;
    const top = circle.y - r.y;
    const bottom = r.y + r.h - circle.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) circle.x = r.x - circle.r;
    else if (m === right) circle.x = r.x + r.w + circle.r;
    else if (m === top) circle.y = r.y - circle.r;
    else circle.y = r.y + r.h + circle.r;
  }
  return true;
}

// ---------------------------------------------------------------- layout

// The museum floor plan. Blocks stop movement AND block sight.
export function buildBlocks() {
  const blocks = [
    // Outer walls.
    { x: 0, y: 0, w: FIELD_W, h: WALL, kind: 'wall' },
    { x: 0, y: FIELD_H - WALL, w: FIELD_W, h: WALL, kind: 'wall' },
    { x: 0, y: 0, w: WALL, h: FIELD_H, kind: 'wall' },
    { x: FIELD_W - WALL, y: 0, w: WALL, h: FIELD_H, kind: 'wall' },
    // Four pillars.
    { x: 408, y: 218, w: 46, h: 46, kind: 'pillar' },
    { x: 408, y: 458, w: 46, h: 46, kind: 'pillar' },
    { x: 826, y: 218, w: 46, h: 46, kind: 'pillar' },
    { x: 826, y: 458, w: 46, h: 46, kind: 'pillar' },
    // Crates on the left route.
    { x: 210, y: 300, w: 72, h: 72, kind: 'crate' },
    { x: 210, y: 430, w: 72, h: 72, kind: 'crate' },
    { x: 300, y: 372, w: 60, h: 60, kind: 'crate' },
    // Display-case plinths on the right route.
    { x: 1000, y: 170, w: 96, h: 52, kind: 'case' },
    { x: 1000, y: 500, w: 96, h: 52, kind: 'case' },
    // The vault block, top-right corner.
    { x: 1060, y: WALL, w: 120, h: 86, kind: 'vault' },
  ];
  return blocks;
}

// Dark carpet where the thief is harder to spot.
export function buildShadows() {
  return [
    { x: 130, y: 110, w: 260, h: 150 },
    { x: 170, y: 410, w: 300, h: 170 },
    { x: 950, y: 300, w: 180, h: 130 },
  ];
}

export function buildLoot() {
  return [
    { id: 'gem-a', kind: 'case', x: 300, y: 140, value: LOOT.caseValue, taken: false, label: 'Sapphire' },
    { id: 'gem-b', kind: 'case', x: 1048, y: 244, value: LOOT.caseValue, taken: false, label: 'Emerald' },
    { id: 'gem-c', kind: 'case', x: 1048, y: 574, value: LOOT.caseValue, taken: false, label: 'Ruby' },
    { id: 'gold', kind: 'gold', x: 640, y: 350, value: LOOT.goldValue, taken: false, label: 'Gold pile' },
  ];
}

// ---------------------------------------------------------------- state

export function createWorld(seed) {
  const world = {
    seed,
    time: 0,
    screen: 'title', // title | playing | paused | caught | win
    player: {
      x: PLAYER.startX,
      y: PLAYER.startY,
      r: PLAYER.radius,
      face: -Math.PI / 2,
      moving: false,
      sneaking: false,
    },
    guards: [
      {
        id: 0, x: 350, y: 320, r: GUARD.radius, face: 0,
        waypoints: [{ x: 350, y: 320 }, { x: 760, y: 320 }],
        leg: 1, state: 'patrol', detection: 0, chaseTimer: 0, spotTimer: 0,
        lastSeenX: 350, lastSeenY: 320,
        investigateX: 0, investigateY: 0, investigateTimer: 0, pauseTimer: 0,
      },
      {
        id: 1, x: 950, y: 260, r: GUARD.radius, face: Math.PI / 2,
        // Rectangular loop: down the right side, across the bottom strip,
        // back up — so the bottom and right lanes are patrolled, not free.
        waypoints: [{ x: 950, y: 260 }, { x: 950, y: 560 }, { x: 1150, y: 560 }, { x: 1150, y: 260 }],
        leg: 1, state: 'patrol', detection: 0, chaseTimer: 0, spotTimer: 0,
        lastSeenX: 950, lastSeenY: 260,
        investigateX: 0, investigateY: 0, investigateTimer: 0, pauseTimer: 0,
      },
      {
        id: 2, x: 500, y: 130, r: GUARD.radius, face: 0,
        waypoints: [{ x: 500, y: 130 }, { x: 900, y: 130 }],
        leg: 1, state: 'patrol', detection: 0, chaseTimer: 0, spotTimer: 0,
        lastSeenX: 500, lastSeenY: 130,
        investigateX: 0, investigateY: 0, investigateTimer: 0, pauseTimer: 0,
      },
    ],
    cameras: [
      { id: 0, x: 400, y: 30, phase: 0, base: Math.PI / 2, sweep: CAMERA.sweep },
      { id: 1, x: 900, y: 30, phase: 1.7, base: Math.PI / 2, sweep: CAMERA.sweep },
      // Right-wall camera: watches the vault approach and the right strip,
      // the lane no patrol used to cover.
      { id: 2, x: 1250, y: 160, phase: 2.2, base: Math.PI, sweep: 0.7 },
    ],
    blocks: buildBlocks(),
    shadows: buildShadows(),
    loot: buildLoot(),
    vault: { x: 1120, y: 130, cracked: false, progress: 0 },
    alarm: 0,
    alarmStage: 0, // 0 calm, 1 on edge (>=50), 2 lockdown imminent (>=75)
    stats: { spotted: 0, peakAlarm: 0, coinsUsed: 0 },
    lootTotal: 0,
    coins: COIN.count,
    coin: null, // { x, y, timer } — a thrown coin on the floor
    exitOpen: false,
    escaped: false,
    bestLoot: 0,
    message: '',
    messageTimer: 0,
    events: [], // one-frame sound cues consumed by main.js
  };
  return world;
}

export function inShadow(world, x, y) {
  return world.shadows.some((s) => pointInRect(x, y, s));
}

export function hasLineOfSight(world, x1, y1, x2, y2) {
  for (const b of world.blocks) {
    if (segmentHitsRect(x1, y1, x2, y2, b)) return false;
  }
  return true;
}

// Is the player inside a cone (origin, facing, range, half-angle) with sight?
export function inCone(world, ox, oy, facing, range, halfAngle, px, py) {
  const dx = px - ox;
  const dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 4) return hasLineOfSight(world, ox, oy, px, py);
  if (Math.abs(angleDiff(Math.atan2(dy, dx), facing)) > halfAngle) return false;
  return hasLineOfSight(world, ox, oy, px, py);
}

export function cameraAngle(cam, time) {
  const base = cam.base ?? Math.PI / 2;
  const sweep = cam.sweep ?? CAMERA.sweep;
  return base + Math.sin(time * CAMERA.sweepSpeed + cam.phase) * sweep;
}

// Attract mode: patrols and cameras keep moving behind the title screen.
export function stepAttract(world, dt) {
  world.time += dt;
  for (const g of world.guards) stepGuard(world, g, dt);
  if (world.messageTimer > 0) world.messageTimer -= dt;
}

export function showMessage(world, text, seconds = 2.6) {
  world.message = text;
  world.messageTimer = seconds;
}

// ---------------------------------------------------------------- actions

export function startGame(world) {
  const fresh = createWorld(world.seed);
  fresh.bestLoot = world.bestLoot;
  Object.keys(fresh).forEach((k) => { world[k] = fresh[k]; });
  world.screen = 'playing';
  showMessage(world, 'Get the loot. Crack the vault. Slip out the exit.', 3.2);
}

export function throwCoin(world, targetX, targetY) {
  if (world.coins <= 0 || world.coin) return false;
  // A throw never lands farther than click range from the thief.
  const p = world.player;
  let tx = targetX;
  let ty = targetY;
  const throwDist = Math.hypot(tx - p.x, ty - p.y);
  if (throwDist > COIN.clickRange) {
    tx = p.x + ((tx - p.x) / throwDist) * COIN.clickRange;
    ty = p.y + ((ty - p.y) / throwDist) * COIN.clickRange;
  }
  // Nudge the landing spot onto open floor: a coin inside a crate, pillar
  // or the vault would leave a guard walking at a wall forever.
  const landing = nearestOpenFloor(world, tx, ty);
  tx = landing.x;
  ty = landing.y;
  world.coins -= 1;
  world.stats.coinsUsed += 1;
  world.coin = { x: tx, y: ty, timer: COIN.investigateSeconds };
  world.events.push('coin');
  showMessage(world, 'Coin tossed — a guard heard it…', 1.8);
  // Only the NEAREST guard inside the ring goes to look, and a coin never
  // wipes a guard's suspicion: detection stays where it was.
  let nearest = null;
  let nearestDist = Infinity;
  for (const g of world.guards) {
    if (g.state === 'chase' || g.state === 'spotted') continue;
    const d = Math.hypot(g.x - tx, g.y - ty);
    if (d <= COIN.distractRadius && d < nearestDist) {
      nearest = g;
      nearestDist = d;
    }
  }
  if (nearest) {
    nearest.state = 'investigate';
    nearest.investigateX = tx;
    nearest.investigateY = ty;
    nearest.investigateTimer = COIN.investigateSeconds;
  }
  return true;
}

// First open-floor point at or near (x, y): the point itself, else a ring
// search outward until the point is inside no block and inside the room.
export function nearestOpenFloor(world, x, y) {
  const insideRoom = (px, py) => px > WALL + 8 && px < FIELD_W - WALL - 8 && py > WALL + 8 && py < FIELD_H - WALL - 8;
  const inBlock = (px, py) => world.blocks.some((b) => pointInRect(px, py, b));
  if (insideRoom(x, y) && !inBlock(x, y)) return { x, y };
  for (let r = 16; r <= 96; r += 16) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (insideRoom(px, py) && !inBlock(px, py)) return { x: px, y: py };
    }
  }
  return { x: clamp(x, WALL + 10, FIELD_W - WALL - 10), y: clamp(y, WALL + 10, FIELD_H - WALL - 10) };
}

function tryGrabLoot(world) {
  const p = world.player;
  for (const item of world.loot) {
    if (item.taken) continue;
    if (Math.hypot(p.x - item.x, p.y - item.y) > LOOT.grabRadius) continue;
    item.taken = true;
    world.lootTotal += item.value;
    if (item.kind === 'case') {
      world.alarm = Math.min(ALARM.max, world.alarm + ALARM.caseSmash);
      showMessage(world, `${item.label} grabbed — +$${item.value} (the case alarm chirped!)`, 2.2);
      world.events.push('smash');
    } else {
      showMessage(world, `${item.label} pocketed — +$${item.value}`, 2.2);
      world.events.push('grab');
    }
    checkExit(world);
    return;
  }
}

function checkExit(world) {
  if (!world.exitOpen && (world.vault.cracked || world.lootTotal >= LOOT.exitOpensAt)) {
    world.exitOpen = true;
    showMessage(world, 'The exit door is open — get out with the loot!', 3);
    world.events.push('exit-open');
  }
}

// ---------------------------------------------------------------- stepping

function moveCircle(world, body, dx, dy) {
  body.x += dx;
  for (const b of world.blocks) pushCircleOutOfRect(body, b);
  body.y += dy;
  for (const b of world.blocks) pushCircleOutOfRect(body, b);
  body.x = clamp(body.x, WALL + body.r, FIELD_W - WALL - body.r);
  body.y = clamp(body.y, WALL + body.r, FIELD_H - WALL - body.r);
}

function stepGuard(world, g, dt) {
  const p = world.player;
  // On edge (alarm >= 50) the guards walk their lanes faster.
  const patrolSpeed = GUARD.patrolSpeed * (world.alarmStage >= 1 ? 1.25 : 1);
  if (g.state === 'spotted') {
    // The "!" freeze: a beat to react before the guard comes for you.
    g.spotTimer -= dt;
    if (g.spotTimer <= 0) g.state = 'chase';
    return;
  }
  if (g.state === 'patrol') {
    const target = g.waypoints[g.leg];
    const dx = target.x - g.x;
    const dy = target.y - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      g.leg = (g.leg + 1) % g.waypoints.length;
      g.pauseTimer = 0.9;
    } else if (g.pauseTimer > 0) {
      g.pauseTimer -= dt;
    } else {
      g.face = Math.atan2(dy, dx);
      const step = patrolSpeed * dt;
      moveCircle(world, g, (dx / dist) * step, (dy / dist) * step);
    }
  } else if (g.state === 'chase') {
    // Chase the last place the guard actually saw you, not your live
    // position through walls: break sight and the guard loses the trail.
    const sees = inCone(world, g.x, g.y, g.face, GUARD.visionRange, GUARD.visionHalfAngle, p.x, p.y);
    if (sees) {
      g.lastSeenX = p.x;
      g.lastSeenY = p.y;
    }
    const dx = g.lastSeenX - g.x;
    const dy = g.lastSeenY - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 10) {
      g.face = Math.atan2(dy, dx);
      const step = GUARD.chaseSpeed * dt;
      moveCircle(world, g, (dx / dist) * step, (dy / dist) * step);
    } else if (!sees) {
      g.state = 'investigate';
      g.investigateX = g.lastSeenX;
      g.investigateY = g.lastSeenY;
      g.investigateTimer = 2;
    }
    g.chaseTimer -= dt;
    if (g.chaseTimer <= 0 && g.detection < 0.5) {
      g.state = 'patrol';
      g.detection = 0;
    }
  } else if (g.state === 'investigate') {
    // The clock runs from the moment the guard sets off, so a guard can
    // never get stuck walking at a wall for the rest of the game.
    g.investigateTimer -= dt;
    if (g.investigateTimer <= 0) {
      g.state = 'patrol';
      g.detection = 0;
      return;
    }
    const dx = g.investigateX - g.x;
    const dy = g.investigateY - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 10) {
      g.face = Math.atan2(dy, dx);
      const step = GUARD.investigateSpeed * dt;
      moveCircle(world, g, (dx / dist) * step, (dy / dist) * step);
    } else {
      // Arrived: look around for the rest of the timer.
      g.face += Math.sin(world.time * 2.4 + g.id) * 0.06;
    }
  }
}

function stepDetection(world, g, dt) {
  const p = world.player;
  const shadowed = inShadow(world, p.x, p.y);
  const seen = inCone(world, g.x, g.y, g.face, GUARD.visionRange, GUARD.visionHalfAngle, p.x, p.y);
  if (seen) {
    // The closer the thief, the faster the guard is sure: a guard that is
    // about to walk into the thief spots them before the collision.
    const dist = Math.hypot(p.x - g.x, p.y - g.y);
    const closeness = 1 + (1 - dist / GUARD.visionRange) * 1.6;
    let rate = shadowed ? GUARD.detectShadow : GUARD.detectOpen;
    if (p.sneaking) rate *= GUARD.sneakFactor;
    if (world.alarmStage >= 1) rate *= 1.25; // on edge: guards notice faster
    g.detection = Math.min(1, g.detection + rate * closeness * dt);
    if (g.detection >= 1 && g.state !== 'chase' && g.state !== 'spotted') {
      g.state = 'spotted';
      g.spotTimer = 0.45;
      g.chaseTimer = GUARD.chaseSeconds;
      world.stats.spotted += 1;
      world.alarm = Math.min(ALARM.max, world.alarm + GUARD.spotAlarm);
      showMessage(world, 'SPOTTED! Run — the alarm is climbing!', 2.6);
      world.events.push('spotted');
    }
  } else {
    g.detection = Math.max(0, g.detection - GUARD.decay * dt);
  }
  return seen;
}

// One fixed simulation step. `input` is the frame's consumed actions:
// { moveX, moveY, sneak, interactHeld, interactPressed, throwAt, pausePressed }
export function stepWorld(world, input, dt) {
  if (world.screen !== 'playing') return;
  world.time += dt;

  // --- player movement
  const p = world.player;
  const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  const mx = input.moveX || 0;
  const my = input.moveY || 0;
  const mag = Math.hypot(mx, my);
  p.moving = mag > 0;
  p.sneaking = !!input.sneak;
  if (mag > 0) {
    p.face = Math.atan2(my, mx);
    moveCircle(world, p, (mx / mag) * speed * dt, (my / mag) * speed * dt);
  }

  // --- coin throw (one-shot)
  if (input.throwAt) throwCoin(world, input.throwAt.x, input.throwAt.y);

  // --- loot grab / vault cracking
  if (input.interactHeld) {
    const vaultDist = Math.hypot(p.x - world.vault.x, p.y - world.vault.y);
    // Crack only from the FRONT of the vault (below its door, near centre):
    // slipping around its right side must not open it for free.
    const atVaultFront = !world.vault.cracked && vaultDist <= LOOT.grabRadius + 14
      && p.y >= 112 && Math.abs(p.x - world.vault.x) <= 60;
    if (atVaultFront) {
      world.vault.progress += dt;
      if (world.vault.progress >= LOOT.vaultHoldSeconds) {
        world.vault.cracked = true;
        world.lootTotal += LOOT.vaultValue;
        world.alarm = Math.min(ALARM.max, world.alarm + ALARM.vaultCrack);
        showMessage(world, 'Vault cracked! +$5,000 — the exit is open!', 3);
        world.events.push('vault');
        checkExit(world);
      }
    } else if (input.interactPressed) {
      tryGrabLoot(world);
    }
  } else {
    world.vault.progress = 0;
  }

  // --- guards: detection first, then movement
  let anyoneSees = false;
  for (const g of world.guards) {
    if (stepDetection(world, g, dt)) anyoneSees = true;
    stepGuard(world, g, dt);
    // Caught by touch — only while the guard is actually chasing you.
    // Bumping into a patrolling guard's back is embarrassing, not fatal.
    if (g.state === 'chase' && Math.hypot(g.x - p.x, g.y - p.y) < GUARD.catchDistance) {
      endCaught(world, 'A guard grabbed you!');
      return;
    }
  }

  // --- cameras: standing in a sweeping cone raises the alarm fast
  let cameraSees = false;
  for (const cam of world.cameras) {
    const ang = cameraAngle(cam, world.time);
    if (inCone(world, cam.x, cam.y, ang, CAMERA.range, CAMERA.halfAngle, p.x, p.y)) {
      cameraSees = true;
      world.alarm = Math.min(ALARM.max, world.alarm + CAMERA.alarmPerSecond * dt);
    }
  }
  if (cameraSees && !world._camWarned) {
    showMessage(world, 'Camera on you — get out of the red cone!', 1.6);
    world._camWarned = true;
  } else if (!cameraSees) {
    world._camWarned = false;
  }

  // --- alarm decay when nobody is watching
  if (!anyoneSees && !cameraSees) {
    world.alarm = Math.max(0, world.alarm - ALARM.decayPerSecond * dt);
  }
  if (world.alarm >= ALARM.max) {
    endCaught(world, 'The alarm hit 100% — the museum locked down!');
    return;
  }
  // Alarm stages: the room gets tenser as the meter climbs.
  world.stats.peakAlarm = Math.max(world.stats.peakAlarm, world.alarm);
  if (world.alarm >= 75 && world.alarmStage < 2) {
    world.alarmStage = 2;
    showMessage(world, 'Alarm 75% — lockdown imminent!', 2.6);
    world.events.push('spotted');
  } else if (world.alarm >= 50 && world.alarmStage < 1) {
    world.alarmStage = 1;
    showMessage(world, 'Alarm 50% — the guards are on edge!', 2.6);
  }

  // --- thrown coin fades
  if (world.coin) {
    world.coin.timer -= dt;
    if (world.coin.timer <= 0) world.coin = null;
  }

  // --- exit: bottom wall, centre, once it is open
  if (world.exitOpen && p.y > 660 && p.x > 600 && p.x < 680) {
    world.screen = 'win';
    world.escaped = true;
    world.bestLoot = Math.max(world.bestLoot, world.lootTotal);
    world.events.push('win');
    return;
  }
  // Locked door feedback: pushing on it says what is still missing.
  if (!world.exitOpen && p.y > 640 && p.x > 600 && p.x < 680) {
    if (!world._exitMsgTimer || world._exitMsgTimer <= 0) {
      showMessage(world, `Locked — carry $1,500 (you have $${world.lootTotal}) or crack the vault.`, 1.8);
      world._exitMsgTimer = 2;
    }
  }
  if (world._exitMsgTimer > 0) world._exitMsgTimer -= dt;

  if (world.messageTimer > 0) world.messageTimer -= dt;
}

function endCaught(world, reason) {
  world.screen = 'caught';
  world.bestLoot = Math.max(world.bestLoot, world.lootTotal);
  showMessage(world, reason, 4);
  world.events.push('caught');
}
