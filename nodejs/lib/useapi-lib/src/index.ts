import { MidjourneyApi, MidjourneyApiImpl, MidjourneyApiOptions } from "./midjourney/MidjourneyApi";

export class UseApiLib {

    static midjourney(options:MidjourneyApiOptions):MidjourneyApi {
        return new MidjourneyApiImpl(options);
    }
}

export * from "./midjourney/MidjourneyApi";
export * from "./midjourney/MidjourneyTypes";