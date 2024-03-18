import OpenAI from "openai";
import { getAppConfig } from "../config";

let openAI:OpenAI|undefined = undefined;

export function getOpenAI():OpenAI{
    if(!openAI){
        const config = getAppConfig();
        openAI = new OpenAI({
            apiKey: config.openai.api_key
        });
    }
    return openAI;
}