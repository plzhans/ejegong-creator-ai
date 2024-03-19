import TelegramBot from "node-telegram-bot-api";
import path from "path";
import { BaseLogger } from "service-base";

const logger = BaseLogger.createLogger(path.basename(__filename, path.extname(__filename)));

export namespace CommandTest {

    export function onMessage({ bot, msg, metadata }: { bot: TelegramBot; msg: TelegramBot.Message; metadata: TelegramBot.Metadata | undefined}){
        const commands = msg.text?.split(' ');
        if(commands){
            switch (commands[1]){
                case "123": {
                    bot.sendMessage(msg.chat.id, "-123", {
                        reply_markup: {
                            inline_keyboard:[[{
                                text:"xx",
                                callback_data: "wee",
                            }]]
                        }
                    })
                } break;
                
                default:
                    break;
            }
        }
    }

    export function onCallbackQuery(bot:TelegramBot, query:TelegramBot.CallbackQuery, args:string[]){
        bot.answerCallbackQuery(query.id).catch(err=>{
            logger.error(`bot.answerCallbackQuery(): error. ${err}`);
        });
    }
}

export default CommandTest;