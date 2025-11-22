import RainAnimation from "../components/animation/RainAnimation";
import DroughtAnimation from "../components/animation/DroughtAnimation";
import { Climate } from "../types/climate";
import TemperatureRiseAnimation from "../components/animation/TemperatureRiseAnimation";
import TornadoAnimation from "../components/animation/TornadoAnimation";

export const climateMap: Partial<Record<Climate, React.ReactNode>> = {
  HEAVY_RAIN_OR_FLOOD: <RainAnimation dropNum={400} />,
  DROUGHT_OR_DESERTIFICATION: <DroughtAnimation />,
  TEMPERATURE_RISE: <TemperatureRiseAnimation />,
  TYPHOON_OR_TORNADO: <TornadoAnimation />,
};
