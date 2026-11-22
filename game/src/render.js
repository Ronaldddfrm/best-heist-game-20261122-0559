// render.js — everything the eye sees in The Midnight Vault, canvas 2D.
// Draws the room, cones, loot, guards, thief, HUD and the title / paused /
// caught / win screens. Also owns the CSS-pixel to field-coordinate mapping.
import { FIELD_W, FIELD_H, WALL, PALETTE, GUARD, CAMERA, LOOT } from './config.js';
import { cameraAngle, inShadow } from './world.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let view = { scale: 1, offsetX: 0, offsetY: 0 };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    const scale = Math.min(canvas.clientWidth / FIELD_W, canvas.clientHeight / FIELD_H);
    view = {
      scale,
      offsetX: (canvas.clientWidth - FIELD_W * scale) / 2,
      offsetY: (canvas.clientHeight - FIELD_H * scale) / 2,
      dpr,
    };
  }

  function toField(cssX, cssY) {
    return {
      x: (cssX - view.offsetX) / view.scale,
      y: (cssY - view.offsetY) / view.scale,
    };
  }

  // How far a ray from (ox, oy) travels before it hits a block (or the range).
  function rayDistance(world, ox, oy, angle, maxDist) {
    const step = 6;
    for (let d = step; d <= maxDist; d += step) {
      const x = ox + Math.cos(angle) * d;
      const y = oy + Math.sin(angle) * d;
      if (world.blocks.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)) return d;
    }
    return maxDist;
  }

  // A vision cone clipped by cover: cast a fan of rays so crates, pillars
  // and the vault cut the wedge short, the way sight really works.
  function drawCone(world, ox, oy, facing, range, halfAngle, fill, edge) {
    const rays = 26;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    for (let i = 0; i <= rays; i++) {
      const a = facing - halfAngle + (2 * halfAngle * i) / rays;
      const d = rayDistance(world, ox, oy, a, range);
      ctx.lineTo(ox + Math.cos(a) * d, oy + Math.sin(a) * d);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawBlock(b) {
    if (b.kind === 'wall') {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = PALETTE.wallTop;
      if (b.h <= WALL) ctx.fillRect(b.x, b.y + b.h - 5, b.w, 5);
      return;
    }
    if (b.kind === 'crate') {
      ctx.fillStyle = PALETTE.crate;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = PALETTE.crateEdge;
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.moveTo(b.x + b.w, b.y);
      ctx.lineTo(b.x, b.y + b.h);
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }
    if (b.kind === 'pillar') {
      ctx.fillStyle = PALETTE.pillar;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = PALETTE.pillarEdge;
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 8);
      return;
    }
    if (b.kind === 'case') {
      ctx.fillStyle = '#39415a';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = PALETTE.caseGlass;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = PALETTE.caseFrame;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      return;
    }
    if (b.kind === 'vault') {
      ctx.fillStyle = '#2c2f3a';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = PALETTE.vaultDoor;
      ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
      ctx.strokeStyle = PALETTE.vaultTrim;
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#6b5518';
      ctx.fill();
      ctx.strokeStyle = PALETTE.vaultTrim;
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }
  }

  function drawLoot(world) {
    for (const item of world.loot) {
      if (item.taken) continue;
      if (item.kind === 'gold') {
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.ellipse(item.x, item.y, 26, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe9a3';
        ctx.beginPath();
        ctx.ellipse(item.x - 4, item.y - 4, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7a5c10';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$800', item.x, item.y + 30);
      } else {
        const bob = Math.sin(world.time * 3 + item.x) * 3;
        ctx.save();
        ctx.translate(item.x, item.y + bob);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = PALETTE.gem;
        ctx.fillRect(-9, -9, 18, 18);
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillRect(-9, -9, 18, 5);
        ctx.restore();
        ctx.fillStyle = '#cfe9e2';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$500', item.x, item.y + 26);
      }
    }
    // Vault dial + crack progress ring.
    const v = world.vault;
    if (!v.cracked) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VAULT — hold E', v.x, v.y + 34);
      if (v.progress > 0) {
        ctx.beginPath();
        ctx.arc(v.x, v.y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (v.progress / LOOT.vaultHoldSeconds));
        ctx.strokeStyle = PALETTE.vaultTrim;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = PALETTE.vaultTrim;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VAULT CRACKED +$5,000', v.x, v.y + 34);
    }
  }

  function drawGuard(world, g) {
    // Vision cone first (under the body).
    const coneFill = g.state === 'chase' ? 'rgba(255, 84, 84, 0.28)' : PALETTE.cone;
    const coneEdge = g.state === 'chase' ? 'rgba(255, 84, 84, 0.7)' : PALETTE.coneEdge;
    drawCone(world, g.x, g.y, g.face, GUARD.visionRange, GUARD.visionHalfAngle, coneFill, coneEdge);
    // Body.
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.guardUniform;
    ctx.fill();
    ctx.strokeStyle = '#3d0f16';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick + cap.
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.face) * (g.r + 6), g.y + Math.sin(g.face) * (g.r + 6));
    ctx.strokeStyle = '#ffd65a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(g.x, g.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#e8dcc0';
    ctx.fill();
    // Detection arc over the head.
    if (g.detection > 0.05 && g.state !== 'chase') {
      ctx.beginPath();
      ctx.arc(g.x, g.y - 22, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.detection);
      ctx.strokeStyle = g.detection > 0.7 ? '#ef4444' : '#f5c542';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    // State mark.
    if (g.state === 'chase' || g.state === 'spotted') {
      ctx.fillStyle = '#ff5252';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 26);
    } else if (g.state === 'investigate') {
      ctx.fillStyle = '#ffd65a';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 26);
    }
  }

  function drawCameras(world) {
    for (const cam of world.cameras) {
      const ang = cameraAngle(cam, world.time);
      drawCone(world, cam.x, cam.y, ang, CAMERA.range, CAMERA.halfAngle, PALETTE.camCone, PALETTE.camConeEdge);
      ctx.fillStyle = '#1a1d26';
      ctx.fillRect(cam.x - 14, cam.y - 8, 28, 16);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cam.x, cam.y + 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#39415a';
      ctx.lineWidth = 2;
      ctx.strokeRect(cam.x - 14, cam.y - 8, 28, 16);
    }
  }

  function drawPlayer(world) {
    const p = world.player;
    if (inShadow(world, p.x, p.y)) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(120, 170, 255, 0.5)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.player;
    ctx.fill();
    ctx.strokeStyle = '#0c101c';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Hood + face direction.
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.face) * 5, p.y + Math.sin(p.face) * 5, 7, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.playerHood;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.face) * (p.r + 7), p.y + Math.sin(p.face) * (p.r + 7));
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (p.sneaking) {
      ctx.fillStyle = '#9db8ff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SNEAK', p.x, p.y - 22);
    }
  }

  function drawExit(world) {
    const open = world.exitOpen;
    ctx.fillStyle = open ? PALETTE.exitOpen : PALETTE.exitClosed;
    ctx.fillRect(600, FIELD_H - WALL, 80, WALL);
    ctx.strokeStyle = open ? '#a9f0c2' : '#8a4a4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(600, FIELD_H - WALL, 80, WALL);
    ctx.fillStyle = '#f2ead8';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'EXIT — GO!' : 'EXIT (LOCKED)', 640, FIELD_H - WALL - 10);
  }

  function drawHud(world) {
    ctx.fillStyle = PALETTE.hudBg;
    ctx.fillRect(0, 0, FIELD_W, 46);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`LOOT  $${world.lootTotal.toLocaleString('en-US')}`, 18, 30);
    // Alarm bar, top centre.
    const barW = 300;
    const barX = FIELD_W / 2 - barW / 2;
    const frac = world.alarm / 100;
    ctx.fillStyle = '#10141f';
    ctx.fillRect(barX - 2, 12, barW + 4, 22);
    ctx.fillStyle = frac < 0.4 ? PALETTE.alarmLow : frac < 0.75 ? PALETTE.alarmMid : PALETTE.alarmHigh;
    ctx.fillRect(barX, 14, barW * frac, 18);
    // At lockdown-imminent the bar pulses red.
    if (world.alarmStage >= 2) {
      ctx.strokeStyle = Math.sin(world.time * 8) > 0 ? '#ff5252' : '#ffb3b3';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = '#5d6a84';
      ctx.lineWidth = 2;
    }
    ctx.strokeRect(barX - 2, 12, barW + 4, 22);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ALARM ${Math.round(world.alarm)}%`, FIELD_W / 2, 27);
    // Coins + timer, right.
    ctx.textAlign = 'right';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`● × ${world.coins}`, FIELD_W - 130, 29);
    ctx.fillStyle = PALETTE.text;
    const mins = Math.floor(world.time / 60);
    const secs = Math.floor(world.time % 60).toString().padStart(2, '0');
    ctx.fillText(`${mins}:${secs}`, FIELD_W - 18, 29);
    // Objective line under the bar.
    ctx.textAlign = 'left';
    ctx.font = '13px sans-serif';
    ctx.fillStyle = PALETTE.textDim;
    const goal = world.vault.cracked
      ? 'Vault cracked — reach the EXIT!'
      : world.exitOpen
        ? 'Exit is open — get out with the loot!'
        : 'Objective: crack the vault ($5,000) or carry $1,500, then reach the exit.';
    ctx.fillText(goal, 18, 66);
    // Transient message.
    if (world.messageTimer > 0 && world.message) {
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10, 14, 24, 0.8)';
      const w = ctx.measureText(world.message).width + 28;
      ctx.fillRect(FIELD_W / 2 - w / 2, 78, w, 30);
      ctx.fillStyle = '#ffe9a3';
      ctx.fillText(world.message, FIELD_W / 2, 99);
    }
    // Best loot, bottom-left.
    ctx.textAlign = 'left';
    ctx.font = '13px sans-serif';
    ctx.fillStyle = PALETTE.textDim;
    if (world.bestLoot > 0) ctx.fillText(`Best getaway: $${world.bestLoot.toLocaleString('en-US')}`, 18, FIELD_H - 12);
  }

  function drawFloor(world) {
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    // Subtle checker so movement reads on screen.
    ctx.fillStyle = PALETTE.floorTile;
    for (let y = WALL; y < FIELD_H - WALL; y += 64) {
      for (let x = WALL; x < FIELD_W - WALL; x += 64) {
        if (((x + y) / 64) % 2 === 0) ctx.fillRect(x, y, 64, 64);
      }
    }
    // Shadow carpet.
    for (const s of world.shadows) {
      ctx.fillStyle = PALETTE.shadow;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = PALETTE.shadowEdge;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(s.x, s.y, s.w, s.h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(157, 184, 255, 0.55)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SHADOW — hard to spot', s.x + 8, s.y + 16);
    }
    // No room label on the floor: the exit-door label sits on the same line
    // at the bottom and the two texts would print over each other.
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 11, 20, 0.78)';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    ctx.fillStyle = accent;
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, FIELD_W / 2, FIELD_H / 2 - 90);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '19px sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD_W / 2, FIELD_H / 2 - 30 + i * 30);
    });
  }

  function render(world) {
    resize();
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = '#0b0e16';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * view.offsetX, view.dpr * view.offsetY);

    drawFloor(world);
    for (const b of world.blocks) drawBlock(b);
    drawLoot(world);
    drawExit(world);
    // Thrown coin on the floor.
    if (world.coin) {
      ctx.beginPath();
      ctx.arc(world.coin.x, world.coin.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.gold;
      ctx.fill();
      ctx.strokeStyle = '#7a5c10';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(world.coin.x, world.coin.y, 13, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245, 197, 66, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    for (const g of world.guards) drawGuard(world, g);
    drawPlayer(world);
    drawHud(world);
    // Cameras last, over the HUD: their mounts sit under the top bar, and
    // the bar used to dim them into mud.
    drawCameras(world);

    if (world.screen === 'title') {
      overlay('THE MIDNIGHT VAULT', [
        'A top-down museum heist. One room, three guards, two cameras.',
        'WASD / arrows — move   •   Shift — sneak   •   E — grab loot / hold to crack the vault',
        'Q or click — throw a coin (3 coins) to distract a guard',
        'Crack the vault (+$5,000) or carry $1,500, then slip out the exit.',
        '',
        'Press SPACE to start the heist',
      ], '#f5c542');
    } else if (world.screen === 'paused') {
      overlay('PAUSED', ['The guards wait. The vault waits.', 'Press P or Esc to keep stealing.'], '#9db8ff');
    } else if (world.screen === 'caught') {
      overlay('CAUGHT!', [
        world.message || 'The heist is over.',
        `Loot carried: $${world.lootTotal.toLocaleString('en-US')}   •   Best getaway: $${world.bestLoot.toLocaleString('en-US')}`,
        '',
        'Press SPACE to try again',
      ], '#ef4444');
    } else if (world.screen === 'win') {
      const mins = Math.floor(world.time / 60);
      const secs = Math.floor(world.time % 60).toString().padStart(2, '0');
      const rank = world.stats.spotted === 0 && world.stats.peakAlarm < 30
        ? 'GHOST — never seen'
        : world.lootTotal >= 5000 ? 'PRO — the vault is yours' : 'SLOPPY — but rich';
      overlay('CLEAN GETAWAY!', [
        `You slipped out with $${world.lootTotal.toLocaleString('en-US')} of loot.`,
        `Time ${mins}:${secs}   •   Peak alarm ${Math.round(world.stats.peakAlarm)}%   •   Spotted ${world.stats.spotted}×   •   Coins used ${world.stats.coinsUsed}`,
        `Rank: ${rank}`,
        `Best getaway: $${world.bestLoot.toLocaleString('en-US')}`,
        '',
        'Press SPACE to run it back',
      ], '#3fbf6a');
    }
  }

  return { render, resize, toField };
}
