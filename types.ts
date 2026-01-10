
export enum BoxType {
  MAILER = 'MAILER', 
  GLUE_BOTTOM = 'GLUE_BOTTOM', 
  TUCK_END = 'TUCK_END', 
  TELESCOPE = 'TELESCOPE', // 天地蓋 (Top and Bottom Box)
  DRAWER = 'DRAWER' 
}

export interface BoxParams {
  type: BoxType;
  w: number;
  d: number;
  h: number;
  t: number;
  g: number;
}

export enum LineType {
  CUT = 'CUT',
  CREASE = 'CREASE',
  DIMENSION = 'DIMENSION'
}

export interface Point {
  x: number;
  y: number;
}

export interface GeometryElement {
  type: LineType;
  points: Point[];
  label?: string;
}
