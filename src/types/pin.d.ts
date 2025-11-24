export interface Pin {
  pinId: number;
  newsId: number;
  latitude: number;
  longitude: number;
  region: string;
  isLately: boolean;
  climateProblem: Climate[];
}

export interface ScreenPin {
  pinId: number;
  x: number;
  y: number;
}

export type Climate =
  | "TEMPERATURE_RISE"
  | "HEAVY_RAIN_OR_FLOOD"
  | "FINE_DUST"
  | "DROUGHT_OR_DESERTIFICATION"
  | "SEA_LEVEL_RISE"
  | "TYPHOON_OR_TORNADO"
  | "WILDFIRE"
  | "EARTHQUAKE";
