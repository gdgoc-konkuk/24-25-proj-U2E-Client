import RainIcon from "../assets/svgs/climate/Rain.svg?react";
import TemperatureIcon from "../assets/svgs/climate/Temperature.svg?react";
import TornadoIcon from "../assets/svgs/climate/Tornado.svg?react";
import DustIcon from "../assets/svgs/climate/Dust.svg?react";
import DroughtIcon from "../assets/svgs/climate/Drought.svg?react";
import SeaLevelIcon from "../assets/svgs/climate/SeaLevel.svg?react";
import WildfireIcon from "../assets/svgs/climate/Wildfire.svg?react";
import EarthquakeIcon from "../assets/svgs/climate/Earthquake.svg?react";

export const climateIcons = [
  { id: "HEAVY_RAIN_OR_FLOOD", icon: RainIcon, label: "Heavy Rain / Flood" },
  { id: "TEMPERATURE_RISE", icon: TemperatureIcon, label: "Temperature Rise" },
  { id: "TYPHOON_OR_TORNADO", icon: TornadoIcon, label: "Typhoon / Tornado" },
  { id: "FINE_DUST", icon: DustIcon, label: "Fine Dust" },
  {
    id: "DROUGHT_OR_DESERTIFICATION",
    icon: DroughtIcon,
    label: "Drought / Desertification",
  },
  { id: "SEA_LEVEL_RISE", icon: SeaLevelIcon, label: "Sea Level Rise" },
  { id: "WILDFIRE", icon: WildfireIcon, label: "Wildfire" },
  { id: "EARTHQUAKE", icon: EarthquakeIcon, label: "Earthquake" },
] as const;
