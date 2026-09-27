export type PlanetId = 'Moon' | 'Mars' | 'Earth' | 'Jupiter' | 'Saturn' | 'Ceres';

export interface Planet {
  id: PlanetId;
  name: string;
  nameHi: string;
  g: number; // m/s^2
  color: string;
  emoji: string;
  skyGradient: [string, string];
  groundColor: string;
  groundDetailColor: string;
  descriptionEn: string;
  descriptionHi: string;
  atmosphereDragCoeff: number; // relative drag density (0 for vacuum, 1 for Earth)
}

export type ScenarioId = 
  | 'sandbox' 
  | 'indoor' 
  | 'fielder' 
  | 'aerodynamics' 
  | 'drone' 
  | 'inclined' 
  | 'monkey';

export type Language = 'en' | 'hi';

export interface Ball {
  id: string;
  type?: 'standard' | 'flat' | 'lofted' | 'vacuum' | 'air' | 'drone_box' | 'monkey_ball' | 'monkey_target';
  x: number; // meters from origin
  y: number; // meters from origin (0 is ground)
  vx: number; // m/s
  vy: number; // m/s
  initialU: number;
  initialTheta: number; // degrees
  color: string;
  label?: string;
  path: { x: number; y: number }[];
  isLanded: boolean;
  hitCeiling?: boolean;
  hitTarget?: boolean;
  landedX?: number;
  landedTime?: number;
  maxH?: number;
  t: number; // flight time elapsed
  dragCoeff?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface TrailRecord {
  id: string;
  scenarioId: ScenarioId;
  planetName: string;
  color: string;
  path: { x: number; y: number }[];
  range: number;
  maxHeight: number;
  timeOfFlight: number;
  u: number;
  theta: number;
  tag?: string;
}
