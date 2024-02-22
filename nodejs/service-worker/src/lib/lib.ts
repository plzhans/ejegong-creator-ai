import { getAppConfig } from "../config";
import { MidjourneyApi, MidjourneyApiOptions, UseApiLib } from "useapi-lib";

let _midjourneyApi:MidjourneyApi|undefined = undefined;

export function midjourneyApi():MidjourneyApi {
    if(!_midjourneyApi) {
        const config = getAppConfig();
        const jobSemaphore = 3;

        const midjourneyApiOptions = new MidjourneyApiOptions(
            config.useapi.token,
            config.useapi.midjourney.discord_token,
            config.useapi.midjourney.discord_server,
            config.useapi.midjourney.discord_channel,
            jobSemaphore,
        );
        _midjourneyApi = UseApiLib.midjourney(midjourneyApiOptions);
    }
    return _midjourneyApi;
}