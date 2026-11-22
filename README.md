# The Midnight Vault

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Ronaldddfrm/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Ronaldddfrm/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down museum heist that plays offline in a desktop browser from its own files.
One room, three guards with vision cones, two sweeping security cameras, a loot target
and an alarm meter — all visible in one frame. Sneak past the cones, crack the vault,
slip out the exit before the alarm hits 100%.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Or serve `game/` with any static HTTP server and open
`game/index.html`.

## How to play

- **WASD / arrow keys** — move the thief
- **Shift** — sneak (slower, harder to spot)
- **E** — grab loot; hold at the vault to crack it (1.5 s)
- **Q or click** — throw a coin to distract a guard (3 coins)
- **P / Esc** — pause
- **Space** — start / try again

Three routes cross the room: left past the crates, middle across the shadow carpet,
right past the display cases. Shadow halves how fast guards spot you. A guard that
fully spots you raises the alarm by 32 and gives chase; a camera in your face raises
it fast. Crack the vault (+$5,000) or carry $1,500 and the exit opens — reach it
for the clean getaway. Your best getaway is remembered between runs. Past 50%
alarm the guards walk faster and notice sooner; past 75% the alarm bar pulses —
get out before it hits 100%.

## Files

- `game/src/config.js` — every tuning number and colour
- `game/src/world.js` — the simulation: guards, cameras, loot, alarm, detection
- `game/src/render.js` — everything the eye sees, canvas 2D
- `game/src/input.js` — keyboard and pointer input
- `game/src/audio.js` — synthesised WebAudio bleeps, no audio files
- `game/src/shots.js` — the four screenshot scenes (`?shot=cover|alert|hide|win`)
- `game/src/random.js` — seeded RNG so the scenes repeat
- `main.ts` — hands the game, its screenshots and a dossier to make.fun

---

<sub>Entered on [make.fun](https://make.fun/?ref=hvvdtetx&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
