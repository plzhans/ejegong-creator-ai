import TelegramBot from "node-telegram-bot-api";
import CommandTest from './command_test';
import CommandShorts from './command_shorts';
import { BaseLogger } from "service-base";
import path from "path";

const logger = BaseLogger.createLogger(path.basename(__filename, path.extname(__filename)));

export function telegramEventMessage(bot:TelegramBot, msg:TelegramBot.Message, metadata?:TelegramBot.Metadata){

    if(msg.text?.startsWith("/") && msg.text.length > 2 ){
        const commands = msg.text.split(' ');
        commands[0] = commands[0].replace('/','');
        switch(commands[0]){
            case CommandShorts.Name: 
                return CommandShorts.onMessage({ bot, msg, metadata, commands });
            case "test":
                return CommandTest.onMessage({ bot, msg, metadata, commands });
        }
    }
}

export function telegramEventCallbackQuery(bot:TelegramBot, query:TelegramBot.CallbackQuery){
    if(!query.data){
        return;
    }
    
    const args = query.data.split(';');
    switch(args[0]){
        case CommandShorts.Name: 
            return CommandShorts.onCallbackQuery(bot,  query, args);
        case "test":
            return CommandTest.onCallbackQuery(bot, query, args);
    }
}