// config.js — every tuning number and colour for The Midnight Vault.
// One room, one night, one very nervous thief.
export const FIELD_W = 1280;
export const FIELD_H = 720;
export const WALL = 24;

export const PLAYER = {
  radius: 14,
  walkSpeed: 212,
  sneakSpeed: 118,
  startX: 120,
  startY: 620,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 56,
  chaseSpeed: 168,
  investigateSpeed: 112,
  visionRange: 235,
  visionHalfAngle: 0.61, // ~35 degrees
  detectOpen: 0.85, // detection per second, lit floor
  detectShadow: 0.4, // detection per second, standing in shadow
  sneakFactor: 0.45, // sneaking multiplies the build rate
  decay: 0.55, // detection lost per second while unseen
  chaseSeconds: 3,
  catchDistance: 27,
  spotAlarm: 32,
};

export const CAMERA = {
  range: 265,
  halfAngle: 0.49, // ~28 degrees
  sweep: 0.85, // radians either side of straight down
  sweepSpeed: 0.55,
  alarmPerSecond: 26,
};

export const ALARM = {
  decayPerSecond: 1.6,
  caseSmash: 4,
  vaultCrack: 10,
  max: 100,
};

export const LOOT = {
  caseValue: 500,
  goldValue: 800,
  vaultValue: 5000,
  vaultHoldSeconds: 1.5,
  grabRadius: 58,
  exitOpensAt: 1500,
};

export const COIN = {
  count: 3,
  throwDistance: 190,
  clickRange: 260, // a click-throw lands no farther than this from the thief
  distractRadius: 340, // only the NEAREST guard inside this ring investigates
  investigateSeconds: 4,
};

export const PALETTE = {
  floor: '#232a3a',
  floorTile: '#272f42',
  wall: '#4a5468',
  wallTop: '#5d6a84',
  shadow: '#1a2130',
  shadowEdge: '#2c3550',
  crate: '#8a6b3f',
  crateEdge: '#6b4f2a',
  pillar: '#3d4763',
  pillarEdge: '#2c3550',
  caseGlass: '#7fd4e8',
  caseFrame: '#c8ccd4',
  gold: '#f5c542',
  gem: '#59e3c8',
  vaultDoor: '#b08d2e',
  vaultTrim: '#e8c85a',
  player: '#1c2436',
  playerHood: '#e8e4d8',
  guard: '#31435f',
  guardUniform: '#7a1f2b',
  cone: 'rgba(255, 214, 90, 0.20)',
  coneEdge: 'rgba(255, 214, 90, 0.55)',
  camCone: 'rgba(255, 84, 84, 0.16)',
  camConeEdge: 'rgba(255, 84, 84, 0.5)',
  exitClosed: '#5a2a2a',
  exitOpen: '#2fae5f',
  hudBg: 'rgba(10, 14, 24, 0.72)',
  text: '#f2ead8',
  textDim: '#aab4c8',
  alarmLow: '#3fbf6a',
  alarmMid: '#f5c542',
  alarmHigh: '#ef4444',
};
