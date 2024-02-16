
import { config } from "../config";
import { MidjourneyApiOptions, UseApiLib } from "useapi-lib";


const midjourneyApiOptions = new MidjourneyApiOptions(
    config.useapi.token,
    config.useapi.midjourney.discord_token,
    config.useapi.midjourney.discord_server,
    config.useapi.midjourney.discord_channel
);

export const MidjourneyApi = UseApiLib.midjourney(midjourneyApiOptions);