import RainAnimation from "../components/animation/RainAnimation";
import DroughtAnimation from "../components/animation/DroughtAnimation";
import FineDustAnimation from "../components/animation/FineDustAnimation";
import EarthquakeAnimation from "../components/animation/EarthquakeAnimation";
import { Climate } from "../types/climate";
import WildfireAnimation from "../components/animation/WildfireAnimation";

export const climateMap: Partial<Record<Climate, React.ReactNode>> = {
  HEAVY_RAIN_OR_FLOOD: <RainAnimation dropNum={400} />,
  DROUGHT_OR_DESERTIFICATION: <DroughtAnimation />,
  FINE_DUST: <FineDustAnimation />,
  EARTHQUAKE: <EarthquakeAnimation />,
  WILDFIRE: <WildfireAnimation />,
};
