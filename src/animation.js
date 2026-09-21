/* Presentation only. Geometry and timing come from the solver/playback modules.
   Light, particles and trails are schematic cues, not a fluid/acoustic solution. */
(function (root) {
  "use strict";
  const B = typeof module !== "undefined" && module.exports ? require("./playback.js") : root.PneumaticPlayback;
  const clamp = (v, low = 0, high = 1) => Math.max(low, Math.min(high, v));
  function draw(ctx, w, h, p, shot, f, t, fmt) {
    const { wall, head, face, step, passageEnd, barrelStart, end, pinLength, scale } = B.mechanism(p, f.pistonX);
    const axis = 156, top = 100, bottom = 212;
    const bb = f.bbExited ? end + (f.t - shot.exitTime) * shot.exitVelocity * (end - barrelStart) / shot.barrelLength : barrelStart + f.bbX / shot.barrelLength * (end - barrelStart);
    const radial = 26 / Math.max(p.headBore, p.nozzleBore, p.airbrakeDiameter);
    const peak = Math.max(1, shot.peakCylinderPressure - shot.ambientPressure, shot.peakPressure - shot.ambientPressure);
    const cylinderGlow = clamp((f.cylinderPressure - shot.ambientPressure) / peak);
    const barrelGlow = clamp((f.pressure - shot.ambientPressure) / peak);
    const amber = "#ffbf69", cyan = "#5de4e7";
    const gradient = (x1, y1, x2, y2, stops) => {
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      stops.forEach(([at, color]) => g.addColorStop(at, color)); return g;
    };
    const rect = (x, y, width, height, fill, stroke) => {
      ctx.fillStyle = fill; ctx.fillRect(x, y, Math.max(0, width), height);
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(x, y, Math.max(0, width), height); }
    };
    const line = (x1, y1, x2, y2, color, width = 1) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    const dot = (x, y, radius, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); };
    const clip = (x, y, width, height, body) => {
      if (width <= 0) return;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip(); body(); ctx.restore();
    };
    const arrow = (x, y, delta, color) => {
      if (Math.abs(delta) < 1) return;
      line(x, y, x + delta, y, color, 2);
      line(x + delta, y, x + delta - Math.sign(delta) * 7, y - 4, color, 2);
      line(x + delta, y, x + delta - Math.sign(delta) * 7, y + 4, color, 2);
    };
    // Symbols compress with their gas region. Drift indicates signed flow only;
    // it is intentionally not a particle-speed or density measurement.
    const gas = (x, y, width, height, level, color, count, flow) => {
      clip(x, y, width, height, () => {
        rect(x, y, width, height, gradient(0, y, 0, y + height, [[0, `${color}12`], [.5, `${color}${Math.round(22 + level * 82).toString(16).padStart(2, "0")}`], [1, `${color}12`]]));
        for (let i = 0; i < count; i++) {
          const phase = ((i * .61803398875 + f.t * 90 * Math.sign(flow)) % 1 + 1) % 1;
          const px = x + phase * width, py = y + 5 + ((i * .41421356237) % 1) * Math.max(1, height - 10);
          ctx.globalAlpha = .2 + level * .6;
          if (Math.abs(flow) > 1e-8) line(px - Math.sign(flow) * (2 + level * 5), py, px, py, color, 1.4);
          else dot(px, py, 1.2, color);
        }
      });
    };
    ctx.save(); ctx.scale(w / 1100, h / 330);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // Subtle drafting grid and centerline give the cutaway a stable reference.
    for (let x = 20; x < 1100; x += 30) line(x, 62, x, 227, "rgba(154,187,204,.035)");
    ctx.setLineDash([3, 6]); line(30, axis, 1080, axis, "#36505b"); ctx.setLineDash([]);
    const steel = gradient(0, top, 0, bottom, [[0, "#80949f"], [.07, "#384955"], [.45, "#18272f"], [.9, "#455b67"], [1, "#9eafb4"]]);
    rect(wall - 6, top - 5, head - wall + 12, bottom - top + 10, steel, "#597480");
    rect(wall, top + 5, head - wall, bottom - top - 10, "#0b141c", "#202f39");
    line(wall, top - 2, head, top - 2, "#afccd266");
    rect(wall - 9, top + 10, 12, 92, "#516670", "#8ba0aa");
    gas(face, top + 6, head - face, 100, cylinderGlow, amber, 34, f.flow);
    // Spring's dark/back and illuminated/front halves share the actual endpoints.
    const springLeft = wall + 9, springRight = face - 32, pitch = Math.max(1, springRight - springLeft) / 13;
    line(springLeft, axis, springRight, axis, "#73848d", 4);
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? gradient(0, axis - 25, 0, axis + 25, [[0, "#ffe1a8"], [.35, amber], [1, "#96612f"]]) : "#604932";
      ctx.lineWidth = pass ? 3.3 : 3.8;
      ctx.beginPath();
      for (let i = 0; i < 13; i++) {
        const x = springLeft + pitch * i;
        ctx.moveTo(x, axis + (pass ? 23 : -23));
        ctx.bezierCurveTo(x + pitch * .35, axis + (pass ? 28 : -28), x + pitch * .65, axis + (pass ? -28 : 28), x + pitch, axis + (pass ? -23 : 23));
      }
      ctx.stroke();
    }
    // Machined piston body, guide rod and seal. Front face stays at solver x.
    const pistonMetal = gradient(face - 30, top, face, bottom, [[0, "#c3d6df"], [.25, "#5d7583"], [.48, "#d6e5e9"], [.72, "#657c89"], [1, "#30444f"]]);
    rect(face - 32, top + 7, 32, 98, pistonMetal, "#bbd0d8");
    rect(face - 7, top + 6, 5, 100, "#182e31", "#78c6bd");
    for (let i = 0; i < 3; i++) line(face - 26 + i * 5, top + 16, face - 26 + i * 5, bottom - 16, "#142a394d");
    // Stepped head and nozzle, preserving the same axial scale as the cylinder.
    rect(head, axis - 35, passageEnd - head, 70, gradient(0, axis - 35, 0, axis + 35, [[0, "#abbbc3"], [.1, "#526675"], [.55, "#273d49"], [1, "#758d9a"]]), "#8199a5");
    for (let x = head + 5; x < passageEnd; x += 7) line(x, axis - 34, x, axis - 26, "#a9bbc544");
    for (const [x, width, height] of [[head, step - head, p.headBore * radial], [step, passageEnd - step, p.nozzleBore * radial]]) {
      rect(x, axis - height / 2, width, height, "#081119", "#738b97");
      gas(x, axis - height / 2, width, height, barrelGlow, cyan, 8, f.flow);
    }
    // The pneumatic cushion is pressure, not contact or an artificial rebound.
    if (f.insertion > 0 && f.cylinderPressure > f.pressure) {
      clip(face, top + 6, head - face, 100, () => {
        const glow = ctx.createRadialGradient(head, axis, 1, head, axis, 60);
        glow.addColorStop(0, `rgba(255,190,89,${clamp((f.cylinderPressure - f.pressure) / peak) * .85})`); glow.addColorStop(1, "rgba(255,190,89,0)");
        rect(head - 60, axis - 55, 60, 110, glow);
        for (const y of [axis - 32, axis + 32]) arrow(head - 3, y, -Math.min(28, (head - face) * .65), amber);
      });
    }
    if (p.airbrakeLength > 0) {
      const thickness = p.airbrakeDiameter * radial, tip = Math.min(pinLength, p.airbrakeTaper * scale), tipHalf = p.airbrakeTipDiameter * radial / 2;
      ctx.fillStyle = gradient(0, axis - thickness / 2, 0, axis + thickness / 2, [[0, "#eff8fb"], [.4, "#a9c0cb"], [1, "#516a77"]]);
      ctx.strokeStyle = "#d3e4e9"; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(face, axis - thickness / 2); ctx.lineTo(face + pinLength - tip, axis - thickness / 2); ctx.lineTo(face + pinLength, axis - tipHalf); ctx.lineTo(face + pinLength, axis + tipHalf); ctx.lineTo(face + pinLength - tip, axis + thickness / 2); ctx.lineTo(face, axis + thickness / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // Barrel cutaway and breech connector; BB never jumps or is held at the muzzle.
    ctx.setLineDash([3, 3]); ctx.strokeStyle = "#7a949e"; ctx.strokeRect(passageEnd, axis - 13, barrelStart - passageEnd, 26); ctx.setLineDash([]);
    rect(barrelStart, axis - 22, end - barrelStart, 44, gradient(0, axis - 22, 0, axis + 22, [[0, "#a08c69"], [.12, "#544d40"], [.5, "#182830"], [1, "#a69067"]]), "#998667");
    rect(barrelStart, axis - 13, end - barrelStart, 26, "#09141c", "#526a72");
    gas(barrelStart, axis - 12, Math.max(0, Math.min(bb, end) - barrelStart), 24, barrelGlow, cyan, 30, f.flow);
    line(end, axis - 23, end, axis + 23, "#c8d9dd", 3);
    const plume = f.bbExited ? clamp(f.outflow / Math.max(shot.peakOutflow, 1e-10)) : 0;
    if (plume > .001) {
      ctx.save(); ctx.globalAlpha = plume;
      for (let i = 0; i < 5; i++) {
        const radius = 9 + i * 4, x = end + 6 + i * 10;
        const glow = ctx.createRadialGradient(x, axis, 1, x, axis, radius);
        glow.addColorStop(0, "#5de4e73d"); glow.addColorStop(1, "#5de4e700");
        dot(x, axis, radius, glow);
      }
      for (let i = 0; i < 15; i++) {
        const progress = ((f.t - shot.exitTime) * 220 + i / 15) % 1;
        const x = end + 4 + progress * 54, y = axis + (i % 5 - 2) * (2 + progress * 7);
        line(x - 3, y, x, y, "#a0fbf3", 1);
      }
      ctx.restore();
    }
    if (bb >= barrelStart && bb < 1110) {
      const direction = Math.sign(f.bbV), trail = Math.max(0, Math.min(70, Math.abs(f.bbV) * .5, direction < 0 ? end - bb : bb - barrelStart));
      const tail = bb - direction * trail;
      if (trail > 0) rect(Math.min(tail, bb), axis - 3, trail, 6, gradient(tail, 0, bb, 0, [[0, "#5de4e700"], [1, "#b8ffffbb"]]));
      const sphere = ctx.createRadialGradient(bb - 2, axis - 3, 1, bb, axis, 8);
      sphere.addColorStop(0, "#ffffff"); sphere.addColorStop(.55, "#e1f4f1"); sphere.addColorStop(1, "#68878d");
      ctx.save(); ctx.shadowColor = cyan; ctx.shadowBlur = Math.min(12, Math.abs(f.bbV) * .12); dot(bb, axis, 8, sphere); ctx.restore();
    }
    arrow(face - 22, 80, Math.sign(f.pistonV) * Math.min(60, Math.abs(f.pistonV) * 10), amber);
    if (bb < 1080) arrow(bb, 117, Math.sign(f.bbV) * Math.min(50, Math.abs(f.bbV)), cyan);
    arrow(head + (passageEnd - head) * .25, 232, Math.sign(f.flow) * Math.min(55, Math.abs(f.flow) * 25000), cyan);
    // Labels remain outside the moving machinery. Readouts below stay accessible.
    ctx.font = `${Math.max(14, 12 * 1100 / w)}px system-ui`; ctx.fillStyle = "#bdced6";
    if (w >= 650) {
      ctx.fillText(t("SPRING / PISTON", "OPRUGA / PISTON"), 40, 36);
      ctx.fillText(t("HEAD / NOZZLE", "GLAVA / MLAZNICA"), 425, 36);
      ctx.fillText(t("INNER BARREL", "UNUTARNJA CIJEV"), 760, 36);
      ctx.fillStyle = amber; ctx.fillText(`${t("Cylinder", "Cilindar")}  ${fmt((f.cylinderPressure - shot.ambientPressure) / 1e5, 2)} bar(g)`, 40, 266);
      ctx.fillStyle = cyan; ctx.fillText(`${t("Behind BB", "Iza BB-a")}  ${fmt((f.pressure - shot.ambientPressure) / 1e5, 2)} bar(g)`, 660, 266);
      rect(40, 279, 270, 3, "#2c363b"); rect(40, 279, cylinderGlow * 270, 3, amber);
      rect(660, 279, 350, 3, "#2c363b"); rect(660, 279, barrelGlow * 350, 3, cyan);
      ctx.fillStyle = "#99aeb9";
      ctx.fillText(`${t("Pin overlap", "Preklapanje pina")} ${fmt(f.insertion * 1000, 2)} mm  ·  ${t("Open area", "Otvor")} ${fmt(f.openArea * 1e6, 3)} mm²`, 40, 311);
    } else {
      ctx.fillText(t("PISTON → HEAD → BB", "PISTON → GLAVA → BB"), 40, 36);
      ctx.fillText(`${t("Pin overlap", "Preklapanje pina")}: ${fmt(f.insertion * 1000, 2)} mm`, 40, 266);
      ctx.fillText(`${t("Open area", "Otvor")}: ${fmt(f.openArea * 1e6, 3)} mm²`, 40, 308);
    }
    ctx.restore();
  }
  const api = { draw };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PneumaticAnimation = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
