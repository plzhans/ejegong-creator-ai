import TelegramBot from 'node-telegram-bot-api';
import path from "path";
import {BaseLogger, currentApp} from 'service-base';
import { getAppConfig } from '../config';
import os from 'os';

const logger = BaseLogger.createLogger(path.basename(__filename, path.extname(__filename)));

let bot:TelegramBot|undefined = undefined;
let defaultChatId:string|undefined = undefined;

namespace telegramBot {
    export function getBot():TelegramBot{
        if(!bot){
            const config = getAppConfig();
            bot = new TelegramBot(config.telegram.bot.token, {
                polling: true
            });
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
        return getBot().sendMessage(getDefaultChatId(), text, options)
            .catch((err)=>{
                logger.error("bot.sendMessage(): fail.");
                logger.error(err);
                return undefined;
            });
    }

    export async function editMessageText(messageId:number, text:string, options?: TelegramBot.EditMessageTextOptions):Promise<TelegramBot.Message|boolean>{
        if(!options){
            options = {}
        }
        options.message_id = messageId;
        if(!options.chat_id){
            options.chat_id = getDefaultChatId();
        }
        return getBot().editMessageText(text, options)
            .catch((err:Error)=>{
                logger.error(`getTelegramBot().editMessageText(): fail. ${err}`);
                return false;
            });
    }

    export function onMessage(action:(bot:TelegramBot, msg:TelegramBot.Message, medadata:TelegramBot.Metadata)=>void){
        const bot = getBot();
        bot.on('message', (msg, medadata) => {
            action(bot, msg, medadata);
        });
        
    }

    export function onChannelPost(action:(bot:TelegramBot, msg:TelegramBot.Message)=>void){
        const bot = getBot();
        bot.on('channel_post', (msg) => {
            action(bot, msg)
        });
    }

    export function onStarted(){
        const app = getAppConfig();
        const pkg = currentApp.getPublicPackageInfo();
        const message = [
            `[SYSTEM][${pkg.name}] start. env=${app.env}`,
            `>> version : ${pkg.version}`,
            `>> hostname: ${os.hostname}`
        ].join('\n');

        const config = getAppConfig();
        const bot = getBot();

        bot.sendMessage(config.telegram.bot.default_chat_id, message)
            .catch(err=>{
                logger.error(`bot.editMessageText(): fail. ${err}`);
            });
    }

    export function onSetMyCommands(commands: TelegramBot.BotCommand[],options?: {language_code?: string;scope?: TelegramBot.BotCommandScope}){
        const bot = getBot();
        bot.setMyCommands(commands, options).catch(err=>{
            logger.error(`bot.setMyCommands(): fail. ${err}`);
        });

    }

    export function onCallbackQuery(action:(bot:TelegramBot, query:TelegramBot.CallbackQuery)=>void){
        const bot = getBot();
        bot.on('callback_query', (query) => {
            action(bot, query)
        });
    }
}

export default telegramBot;