import { getAppConfig } from "../config";
import TelegramBot from 'node-telegram-bot-api';
import { createLogger } from "./logger";
import path from "path";

const logger = createLogger(path.basename(__filename, path.extname(__filename)));

let bot:TelegramBot|undefined = undefined;
let defaultChatId:string|undefined = undefined;

namespace telegram {
    export function getTelegramBot():TelegramBot{
        if(!bot){
            const config = getAppConfig();
            bot = new TelegramBot(config.telegram.bot.token, {});
        }
        return bot;
    }
    
    export function getDefaultChatId():string {
        if(!defaultChatId){
            const config = getAppConfig();
            defaultChatId = config.telegram.bot.default_chat_id;
        }
        return defaultChatId;
    }
    
    export async function sendMessage(text:string, options?: TelegramBot.SendMessageOptions):Promise<TelegramBot.Message|undefined>{
        return getTelegramBot().sendMessage(getDefaultChatId(), text, options)
            .catch((err)=>{
                logger.error("getTelegramBot().sendMessage(): fail.");
                logger.error(err);
                return undefined;
            });
    }
}

export default telegram;