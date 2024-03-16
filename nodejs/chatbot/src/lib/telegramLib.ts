// import { getAppConfig } from "../config";
// import TelegramBot from 'node-telegram-bot-api';
// import { createLogger } from "./logger";
// import path from "path";

// const logger = createLogger(path.basename(__filename, path.extname(__filename)));

// let bot:TelegramBot|undefined = undefined;
// let defaultChatId:string|undefined = undefined;

// namespace telegramLib {
//     export function getBot():TelegramBot{
//         if(!bot){
//             const config = getAppConfig();
//             bot = new TelegramBot(config.telegram.bot.token, {});
//         }
//         return bot;
//     }
    
//     export function getDefaultChatId():string {
//         if(!defaultChatId){
//             const config = getAppConfig();
//             defaultChatId = config.telegram.bot.default_chat_id;
//         }
//         return defaultChatId;
//     }
    
//     export async function sendMessage(text:string, options?: TelegramBot.SendMessageOptions):Promise<TelegramBot.Message|undefined>{
//         return getBot().sendMessage(getDefaultChatId(), text, options)
//             .catch((err)=>{
//                 logger.error("getTelegramBot().sendMessage(): fail.");
//                 logger.error(err);
//                 return undefined;
//             });
//     }

//     export async function editMessageText(messageId:number, text:string, options?: TelegramBot.EditMessageTextOptions):Promise<TelegramBot.Message|boolean>{
//         if(!options){
//             options = {}
//         }
//         options.message_id = messageId;
//         if(!options.chat_id){
//             options.chat_id = getDefaultChatId();
//         }
//         return getBot().editMessageText(text, options)
//             .catch((err:Error)=>{
//                 logger.error(`getTelegramBot().editMessageText(): fail. ${err}`);
//                 return false;
//             });
//     }
// }

// export default telegramLib;