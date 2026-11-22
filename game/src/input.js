// input.js — keyboard + pointer input for The Midnight Vault.
// One-shot flags are taken exactly once per frame by the game loop, so a
// throw or a pause can never be eaten by two different handlers.
export function createInput(canvas, toField) {
  const keys = new Set();
  const state = {
    clickThrow: null, // { x, y } in field coords, or null
    clickQueued: false, // a pointer press this frame (menus use it to start)
    throwQueued: false,
    pauseQueued: false,
    startQueued: false,
    interactQueued: false,
  };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space') state.startQueued = true;
    if (event.code === 'KeyP' || event.code === 'Escape') state.pauseQueued = true;
    if (event.code === 'KeyQ') state.throwQueued = true;
    if (event.code === 'KeyE') state.interactQueued = true;
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const field = toField(event.clientX - rect.left, event.clientY - rect.top);
    state.clickThrow = field;
    state.clickQueued = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);

  function moveVector() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    return { x, y };
  }

  // Take this frame's actions. Callers must call this once per frame.
  function takeActions(player) {
    const move = moveVector();
    let throwAt = null;
    if (state.clickThrow) {
      throwAt = state.clickThrow;
      state.clickThrow = null;
    } else if (state.throwQueued) {
      state.throwQueued = false;
      const fx = Math.cos(player.face);
      const fy = Math.sin(player.face);
      throwAt = { x: player.x + fx * 190, y: player.y + fy * 190 };
    }
    const actions = {
      moveX: move.x,
      moveY: move.y,
      sneak: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      interactHeld: keys.has('KeyE'),
      interactPressed: state.interactQueued,
      throwAt,
      clicked: state.clickQueued,
      pausePressed: state.pauseQueued,
      startPressed: state.startQueued,
    };
    state.clickQueued = false;
    state.pauseQueued = false;
    state.startQueued = false;
    state.interactQueued = false;
    return actions;
  }

  return { takeActions, keys };
}
