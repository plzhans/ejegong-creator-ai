import { getAppConfig } from "../config";
import { AirtableSchemaOptions } from "../datatypes/Common";
import { ConfigRepo, ConfigRepoImpl } from "./ConfigRepo";
import { QuoteImageRepo, QuoteImageRepoImpl } from "./QuoteImageRepo";
import { QuoteRepo, QuoteRepoImpl } from "./QuoteRepo";

let _ConfigRepo:ConfigRepo|undefined = undefined;
export function ConfigRepo():ConfigRepo {
    if(!_ConfigRepo){
        const appConfig = getAppConfig();
        const options = new AirtableSchemaOptions(appConfig.airtable.token, appConfig.airtable.tables.config);
        _ConfigRepo = new ConfigRepoImpl(options);
    }
    return _ConfigRepo;
}

let _QuoteRepo:QuoteRepo|undefined = undefined;
export function QuoteRepo():QuoteRepo {
    if(!_QuoteRepo){
        const appConfig = getAppConfig();
        const options = new AirtableSchemaOptions(appConfig.airtable.token, appConfig.airtable.tables.quote);
        _QuoteRepo = new QuoteRepoImpl(options);
    }
    return _QuoteRepo;
}

let _QuoteImageRepo:QuoteImageRepo|undefined = undefined;
export function QuoteImageRepo():QuoteImageRepo {
    if(!_QuoteImageRepo){
        const appConfig = getAppConfig();
        const options = new AirtableSchemaOptions(appConfig.airtable.token, appConfig.airtable.tables.quote_image);
        _QuoteImageRepo = new QuoteImageRepoImpl(options);
    }
    return _QuoteImageRepo;
}
