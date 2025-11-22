import RainAnimation from "../components/animation/RainAnimation";
import DroughtAnimation from "../components/animation/DroughtAnimation";
import FineDustAnimation from "../components/animation/FineDustAnimation";
import EarthquakeAnimation from "../components/animation/EarthquakeAnimation";
import WildfireAnimation from "../components/animation/WildfireAnimation";
import { Climate } from "../types/climate";
import SeaLevelRiseAnimation from "../components/animation/SeaLevelRiseAnimation";
import TemperatureRiseAnimation from "../components/animation/TemperatureRiseAnimation";
import TornadoAnimation from "../components/animation/TornadoAnimation";

export const climateMap: Partial<Record<Climate, React.ReactNode>> = {
  HEAVY_RAIN_OR_FLOOD: <RainAnimation dropNum={400} />,
  DROUGHT_OR_DESERTIFICATION: <DroughtAnimation />,
  FINE_DUST: <FineDustAnimation />,
  EARTHQUAKE: <EarthquakeAnimation />,
  WILDFIRE: <WildfireAnimation />,
  SEA_LEVEL_RISE: <SeaLevelRiseAnimation />,
  TEMPERATURE_RISE: <TemperatureRiseAnimation />,
  TYPHOON_OR_TORNADO: <TornadoAnimation />,
};
