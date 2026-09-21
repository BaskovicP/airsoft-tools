/* Presentation only: never changes solver positions, velocities, events or energy. */
(function (root) {
  "use strict";
  const clamp = v => Math.max(0, Math.min(1, v));
  function timeline(shot, uniform = false) {
    const duration = Math.max(0, shot.duration);
    const focusEnd = Number.isFinite(shot.exitTime) ? Math.min(duration, shot.exitTime + .0015) : duration;
    // Reserve most screen time for firing; still show EVERY later state through
    // the true end of the run. The clock and graphs remain physical milliseconds.
    const split = !uniform && focusEnd > 0 && focusEnd < duration * .8 ? .8 : 1;
    return { duration, focusEnd: split === 1 ? duration : focusEnd, split,
      timeAt(progress) {
        const f = clamp(progress);
        if (split === 1) return f * duration;
        return f <= split ? f / split * focusEnd : focusEnd + (f - split) / (1 - split) * (duration - focusEnd);
      },
      progressAt(time) {
        const value = Math.max(0, Math.min(duration, time));
        if (!duration) return 0;
        if (split === 1) return value / duration;
        return value <= focusEnd ? value / focusEnd * split : split + (value - focusEnd) / (duration - focusEnd) * (1 - split);
      }
    };
  }
  function frameAt(shot, time) {
    const frames = shot.frames, target = Math.max(frames[0].t, Math.min(frames.at(-1).t, time));
    // Last sample at/before target: selects the post-contact side of a duplicate timestamp.
    let lo = 0, hi = frames.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (frames[mid].t <= target) lo = mid + 1; else hi = mid; }
    const a = frames[Math.max(0, lo - 1)], b = frames[Math.min(lo, frames.length - 1)];
    const mix = b.t > a.t ? (target - a.t) / (b.t - a.t) : 0, out = { ...a, t: target };
    for (const key of Object.keys(a)) if (typeof a[key] === "number" && key !== "t") out[key] = a[key] + (b[key] - a[key]) * mix;
    out.bbExited = shot.exitTime !== null && target >= shot.exitTime;
    out.pistonHit = shot.pistonHitTime !== null && target >= shot.pistonHitTime;
    return out;
  }
  function mechanism(p, pistonX) {
    // A shared axial scale for stroke AND head passages prevents the pin from
    // entering a drawn head before the solver's actual geometric entry event.
    const face0 = 110, scale = 430 / (p.strokeLength + p.headLength + p.nozzleLength);
    const head = face0 + p.strokeLength * scale, step = head + p.headLength * scale;
    const passageEnd = step + p.nozzleLength * scale, face = face0 + pistonX * 1000 * scale;
    return { wall: 40, face0, face, head, step, passageEnd, barrelStart: passageEnd + 20, end: 1040,
      pinLength: p.airbrakeLength * scale, pinTip: face + p.airbrakeLength * scale, scale };
  }
  const api = { timeline, frameAt, mechanism };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PneumaticPlayback = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
