declare module 'poly-decomp' {
  export function decomp(polygon: number[][]): number[][][];
  export function isSimple(polygon: number[][]): boolean;
  export function makeCCW(polygon: number[][]): number[][];
  export function quickDecomp(polygon: number[][]): number[][][];
  export function removeCollinearPoints(
    polygon: number[][],
    thresholdAngle?: number
  ): number[][];
  export function removeDuplicatePoints(
    polygon: number[][],
    precision?: number
  ): number[][];
}
