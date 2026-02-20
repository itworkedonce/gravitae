// -----------------------------
// Gravitae Types: Core Data Structures
// -----------------------------
// Defines TypeScript interfaces for physics simulation and After Effects layer data.
// Ensures type safety across geometry processing, physics bodies, and layer transformations.

import { Body as MatterBody } from "matter-js";
import { Engine } from "matter-js";
// Matter.js body extended with Gravitae plugin metadata linking to the originating After Effects layer
export interface Body extends MatterBody {
  plugin: {
    layerData: {
      inOut?: number[];
      layerId: number;
    };
  };
}

// Physics body state representation for serialization and Matter.js integration
export interface MatterBodyProperties {
  id: number;
  label: string;
  type: "body";
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  force: { x: number; y: number };
  torque: number;
  angle: number;
  angularVelocity: number;
  angularSpeed: number;
  isStatic?: boolean;
  isSleeping: boolean;
  mass: number;
  density: number;
  inertia: number;
  inverseMass: number;
  inverseInertia: number;
  friction: number;
  frictionStatic: number;
  frictionAir: number;
  restitution: number;
  collisionFilter: {
    category: number;
    mask: number;
    group: number;
  };
  slop: number;
  timeScale: number;
  sleepThreshold: number;
  plugin: Record<string, unknown>;
  parts: number;
  parent: null;
  bounds: {
    min: { x: number; y: number };
    max: { x: number; y: number };
  };
}

// After Effects shape data structure for geometry processing and physics body creation
export interface Shape {
  type: "rectangle" | "ellipse" | "path" | "polygon" | "star";
  position: number[];
  originalPos: number[];
  anchor?: number[];
  size: number[];
  rotation: number;
  points: number;
  scale: number[];
  roundness: number;
  outerRadius: number;
  innerRadius: number;
  innerRoundness: number;
  outerRoundness: number;
  starRotation: number;
  anchorOffset?: number[];
  verticesData?: {
    index: number;
    position: number[];
    inTangent: number[];
    outTangent: number[];
  }[];
}

// Shape information for layer geometry processing
export interface ShapeInfo {
  layerName: string;
  type?: string; // e.g. "rectangle", "ellipse", "mask"
  size?: [number, number];
  position?: [number, number];
  originalPos?: [number, number];
  roundness?: number;
  radius?: number;
  innerRadius?: number;
  outerRadius?: number;
  innerRoundness?: number;
  outerRoundness?: number;
  points?: number;
  rotation?: number;
  starRotation?: number;
  vertices?: number;
  scale?: [number, number];
  anchor?: [number, number]; // useful for masks
  verticesData?: VertexData[];
}

// Minimal vertex representation for shape paths (index + position + optional tangents)
export interface VertexData {
  index: number;
  position: [number, number];
  inTangent?: [number, number];
  outTangent?: [number, number];
}

// Generic series format for animated properties
export interface AnimatedSeries<T> {
  preValue: T;
  values: T[];
  lastKeyFrame: { frame: number; isHold: boolean } | null;
}
// Common properties shared across all After Effects layer types
export interface BaseLayer {
  name: string;
  type: string;
  isStatic?: boolean;
  isCentroidSet: boolean;
  matterObject?: MatterBodyProperties;
  inOut?: number[];
  layerRotation: number;
  layerScale: number[];
  layerPosition: number[];
  layerAnchor: number[];
  shapeInfo?: ShapeGroup;
  animatedProperties?: {
    position: AnimatedSeries<[number, number]>;
    rotation: AnimatedSeries<number>;
    scale: AnimatedSeries<[number, number]>;
    anchorPoint: AnimatedSeries<[number, number]>;
    bodyType: AnimatedSeries<number>;
    density: AnimatedSeries<number>;
    friction: AnimatedSeries<number>;
    frictionAir: AnimatedSeries<number>;
    restitution: AnimatedSeries<number>;
  };
  startPropertiesValues?: {
    bodyType: number;
    density: number;
    friction: number;
    frictionAir: number;
    restitution: number;
  };
  simulatedKeyframes?: {
    position: number[][];
    rotation: number[];
  };
}

// Layer type discrimination for type-safe processing of different After Effects layer kinds
export interface ShapeLayer extends BaseLayer {
  type: "shape";
  shapes: Record<string, ShapeGroup>;
  masks?: Record<string, ShapeGroup>;
}


export interface TextLayer extends BaseLayer {
  type: "text";
  shapes: Record<string, ShapeGroup>;
  masks?: Record<string, ShapeGroup>;
}

// Union of supported AE layer kinds processed by Gravitae
export type Layer = ShapeLayer | TextLayer;
// export type Layer = ShapeLayer | MediaLayer | TextLayer | SolidLayer | CompositionLayer;

// Map of layer index -> layer data within a composition
export type CompositionLayers = Record<number, BaseLayer>;

// Composition-level simulation and animation properties
export interface CompositionData {
  layers: CompositionLayers;
  gravityAngle?: number | number[];
  gravityScale?: number | number[];
  drag?: number | number[];
  animatedGravityProperties?: {
    gravityAngle?: AnimatedSeries<number>;
    gravityScale?: AnimatedSeries<number>;
    drag?: AnimatedSeries<number>;
  };
  isApplied?: boolean;
}



// Map of composition name -> composition data for the entire project
export type ProjectCompositions = Record<string, CompositionData>;

// Geometric vertex representation for star and polygon shape generation
export interface VertexPoint {
  x: number;
  y: number;
  angle: number;
  radius: number;
  isOuter: boolean;
  roundness: number;
}

// Bezier curve segment with control points for smooth shape interpolation
export interface BezierSegment {
  point: VertexPoint;
  cp1: { x: number; y: number };
  cp2: { x: number; y: number };
}

// After Effects path vertex with tangent handles for Bezier curve processing
export interface Vertex {
  index: number;
  position: [number, number];
  inTangent: [number, number];
  outTangent: [number, number];
}

// -----------------------------
// Simulation Frame Data Types
// -----------------------------
// FrameData, BodyState, and AnimatedPropertyValues are defined below.

// Nested tree of shapes and groups parsed from AE; keys are shape/mask names
export type ShapeGroup = {
  [key: string]: ShapeInfo | ShapeGroup;
};

// Legacy alias for text shapes mirroring ShapeGroup structure
export type textShape = {
  [key: string]: ShapeInfo | ShapeGroup;
};

// Transform values applied to a shape or layer in local coordinates
export interface TransformData {
  position: [number, number];
  originalPos: [number, number];
  rotation: number;
  scale: [number, number];
  anchor?: [number, number];
}

// 2D affine transform matrix (a,b,c,d,tx,ty) used for geometry transforms
export type Matrix2D = {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
};

// Post-processed shapes tree after normalization/transforms
export type ProcessedShapes = {
  [key: string]: ShapeInfo | ProcessedShapes;
};



// Serializable snapshot of a Matter body for preview/playback.
// position/angle mirror Matter world values; scale mirrors AE layer scale.
// plugin.layerData links the body back to its AE layer and in/out range.
export interface BodyState {
  id: number;
  position: { x: number; y: number };
  angle: number;
  scale: { x: number; y: number };
  isStatic: boolean;
  opacity: number;
  fillStyle?: string;
  strokeStyle?: string;
  plugin: {
    layerData: {
      layerId: number;
      inOut: any;
    };
    [key: string]: any;
  };
}

// Single frame of the simulation timeline.
// time is seconds since start; bodies are per-frame snapshots.
export interface FrameData {
  time: number;
  bodies: BodyState[];
}

// Props consumed by the preview renderer to coordinate UI and engine state.
export interface PreviewRendererProps {
  matterBodies: { [key: number]: any };
  simulationStatus?: string;
  onBodiesInitialized?: (engine: Engine) => void;
  workarea: [number, number];
  setSimulationStatus: (
    status: "idle" | "preparing" | "running" | "completed"
  ) => void;
  compFramerate: number;
  containerRef: React.RefObject<HTMLDivElement>;
  compSize: [number, number];
  setIsProcessing: (processing: boolean) => void;
}

// Per-layer plan of animated series used by the runner.
// physicsStartFrame gates physics based on last position keyframe.
export interface AnimationPlan {
  physicsStartFrame: number;
  layers: Record<
    number,
    {
      name: string;
      position?: { pre: [number, number]; values: [number, number][]; last?: number; isHold?: boolean };
      rotation?: { pre: number; values: number[]; last?: number; isHold?: boolean };
      scale?: { pre: [number, number]; values: [number, number][]; last?: number };
      anchorPoint?: { pre: [number, number]; values: [number, number][]; last?: number };
      density?: { pre: number; values: number[]; last?: number };
      friction?: { pre: number; values: number[]; last?: number };
      frictionAir?: { pre: number; values: number[]; last?: number };
      restitution?: { pre: number; values: number[]; last?: number };
      bodyType?: { pre: number; values: number[]; last?: number };
    }
  >;
}

// Raw AE sampling arrays per property.
// Each present array is shaped as [preValue, frame0, frame1, ...].
// AE naming uses airFriction; it is normalized to frictionAir later.
export interface AnimatedPropertyValues {
  position?: any[];
  rotation?: any[];
  scale?: any[];
  anchorPoint?: any[];
  bodyType?: any[];
  density?: any[];
  friction?: any[];
  airFriction?: any[];
  restitution?: any[];
}
