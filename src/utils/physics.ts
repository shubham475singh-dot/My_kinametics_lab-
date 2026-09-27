export interface TrajectoryPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
}

// Classical ideal vacuum kinematics
export function calcVacuumStats(u: number, thetaDeg: number, g: number) {
  const rad = (thetaDeg * Math.PI) / 180;
  const sin = Math.sin(rad);
  const sin2 = Math.sin(2 * rad);

  const R = (u * u * sin2) / g;
  const H = (u * u * sin * sin) / (2 * g);
  const T = (2 * u * sin) / g;

  return { R, H, T, vx0: u * Math.cos(rad), vy0: u * Math.sin(rad) };
}

// Full trajectory points generator for vacuum
export function getIdealPath(u: number, thetaDeg: number, g: number, steps = 80): { x: number; y: number }[] {
  const { T, vx0, vy0 } = calcVacuumStats(u, thetaDeg, g);
  if (T <= 0) return [{ x: 0, y: 0 }];

  const points: { x: number; y: number }[] = [];
  const dt = T / steps;

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const x = vx0 * t;
    const y = Math.max(0, vy0 * t - 0.5 * g * t * t);
    points.push({ x, y });
  }

  return points;
}

// Aerodynamic drag numerical integration (RK2 / Midpoint with sub-stepping for smooth precision)
// F_drag = -k * v * v_vec => a_x = -k * v * vx, a_y = -g - k * v * vy
export function getDragPath(
  u: number, 
  thetaDeg: number, 
  g: number, 
  k: number, 
  dt = 0.005
): { path: { x: number; y: number }[]; R: number; H: number; T: number } {
  const rad = (thetaDeg * Math.PI) / 180;
  let x = 0;
  let y = 0;
  let vx = u * Math.cos(rad);
  let vy = u * Math.sin(rad);
  let t = 0;
  let maxH = 0;

  const path: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  let sampleTimer = 0;
  const sampleInterval = 0.02; // Sample every 20ms for lightweight rendering

  while (y >= 0 && t < 30) {
    const v = Math.sqrt(vx * vx + vy * vy);
    const ax = -k * v * vx;
    const ay = -g - k * v * vy;

    // Midpoint method for numerical stability
    const vxMid = vx + 0.5 * ax * dt;
    const vyMid = vy + 0.5 * ay * dt;
    const vMid = Math.sqrt(vxMid * vxMid + vyMid * vyMid);

    const axMid = -k * vMid * vxMid;
    const ayMid = -g - k * vMid * vyMid;

    const prevX = x;
    const prevY = y;
    const prevT = t;

    x += vxMid * dt;
    y += vyMid * dt;
    vx += axMid * dt;
    vy += ayMid * dt;
    t += dt;
    sampleTimer += dt;

    if (y > maxH) maxH = y;

    if (y >= 0) {
      if (sampleTimer >= sampleInterval) {
        path.push({ x, y });
        sampleTimer = 0;
      }
    } else {
      // Linear interpolation to land precisely at ground level y = 0
      const fraction = prevY / (prevY - y);
      const groundX = prevX + (x - prevX) * fraction;
      const groundT = prevT + dt * fraction;
      path.push({ x: groundX, y: 0 });
      return { path, R: groundX, H: maxH, T: groundT };
    }
  }

  const last = path[path.length - 1];
  const R = last ? last.x : 0;
  return { path, R, H: maxH, T: t };
}

// Find optimal angle for drag empirically across angles 15° to 60° with 0.5° precision
export function findOptimalDragAngle(u: number, g: number, k: number): { bestAngle: number; maxRange: number } {
  let bestAngle = 45;
  let maxRange = 0;

  for (let ang = 15; ang <= 60; ang += 0.5) {
    const { R } = getDragPath(u, ang, g, k, 0.01);
    if (R > maxRange) {
      maxRange = R;
      bestAngle = ang;
    }
  }

  return { bestAngle, maxRange };
}

// Indoor safe ceiling angle calculation
export function calcIndoorOptimalSafe(u: number, g: number, ceilingH: number): { safeAngle: number; isUnconstrained: boolean; maxRange: number } {
  const inner = (2 * g * ceilingH) / (u * u);
  if (inner >= 1) {
    // Ceiling is higher than maximum achievable height at 45°
    const R = (u * u) / g;
    return { safeAngle: 45, isUnconstrained: true, maxRange: R };
  }

  // Safe angle limit: sin(theta) <= sqrt(2gH) / u
  const safeAngle = Math.asin(Math.sqrt(inner)) * (180 / Math.PI);
  const R = (u * u * Math.sin(2 * safeAngle * (Math.PI / 180))) / g;

  return { safeAngle, isUnconstrained: false, maxRange: R };
}

// Fielder dual angles for target distance R
export function calcFielderAngles(u: number, g: number, targetR: number): { flatAngle: number; loftedAngle: number; tFlat: number; tLoft: number; isReachable: boolean; minSpeedNeeded: number } {
  const minSpeedNeeded = Math.sqrt(targetR * g);
  const ratio = (targetR * g) / (u * u);

  if (ratio > 1) {
    return {
      flatAngle: 45,
      loftedAngle: 45,
      tFlat: 0,
      tLoft: 0,
      isReachable: false,
      minSpeedNeeded,
    };
  }

  const flatRad = 0.5 * Math.asin(ratio);
  const flatAngle = (flatRad * 180) / Math.PI;
  const loftedAngle = 90 - flatAngle;

  const tFlat = (2 * u * Math.sin(flatRad)) / g;
  const loftedRad = (loftedAngle * Math.PI) / 180;
  const tLoft = (2 * u * Math.sin(loftedRad)) / g;

  return {
    flatAngle,
    loftedAngle,
    tFlat,
    tLoft,
    isReachable: true,
    minSpeedNeeded,
  };
}

// Inclined plane physics
// Incline angle alpha (deg), launch angle theta (deg from horizontal)
// Optimal launch angle for max range up the incline is theta = 45° + alpha/2
export function calcInclineRange(u: number, thetaDeg: number, alphaDeg: number, g: number): number {
  const theta = (thetaDeg * Math.PI) / 180;
  const alpha = (alphaDeg * Math.PI) / 180;

  if (theta <= alpha) return 0;

  // Formula: R_incline = (u^2 / (g * cos^2(alpha))) * (sin(2*theta - alpha) - sin(alpha))
  const cosAlpha = Math.cos(alpha);
  const numerator = Math.sin(2 * theta - alpha) - Math.sin(alpha);
  const denom = g * cosAlpha * cosAlpha;

  return Math.max(0, (u * u * numerator) / denom);
}

// Drone rescue forward drop distance
// T_fall = sqrt(2h / g), D_forward = v_x * T_fall
export function calcDroneDrop(h: number, vx: number, g: number) {
  const tFall = Math.sqrt((2 * h) / g);
  const forwardDist = vx * tFall;
  return { tFall, forwardDist };
}

// Monkey & hunter collision parameters
export function calcMonkeyHunter(D: number, H: number, u: number, g: number) {
  const thetaRad = Math.atan2(H, D);
  const thetaDeg = (thetaRad * 180) / Math.PI;

  const vx = u * Math.cos(thetaRad);
  const tHit = D / vx;
  const dropDistance = 0.5 * g * tHit * tHit;
  const hitHeight = H - dropDistance;

  return {
    thetaDeg,
    tHit,
    dropDistance,
    hitHeight,
    willHitBeforeGround: hitHeight >= 0,
  };
}
