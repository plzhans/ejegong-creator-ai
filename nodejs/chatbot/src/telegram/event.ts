import TelegramBot from "node-telegram-bot-api";
import CommandTest from './command_test';
import CommandShorts from './command_shorts';
import { BaseLogger } from "service-base";
import path from "path";
import CommandChatGPT from "./command_chatgpt";

const logger = BaseLogger.createLogger(path.basename(__filename, path.extname(__filename)));

export function telegramEventMessage(bot:TelegramBot, botUser:TelegramBot.User,  msg:TelegramBot.Message, metadata?:TelegramBot.Metadata){
    const botCommand = msg.entities?.find(x=>x.type === "bot_command")
    if(botCommand){
        const command = msg.text?.split(' ')?.[0];
        switch(command){
            case CommandShorts.Name: 
            case `${CommandShorts.Name}@${botUser.username}`:
                return CommandShorts.onMessage({ bot, msg, metadata });
            case CommandChatGPT.Name:
            case `${CommandChatGPT.Name}@${botUser.username}`:
                return CommandChatGPT.onMessage({ bot, msg, metadata });
            case "test":
                return CommandTest.onMessage({ bot, msg, metadata });
        }
    }
    
    if(msg.reply_to_message?.text === CommandChatGPT.ForceReplyText){
        return CommandChatGPT.onMessage({ bot, msg, metadata });
    }
}

export function telegramEventCallbackQuery(bot:TelegramBot, botUser:TelegramBot.User, query:TelegramBot.CallbackQuery){
    if(!query.data){
        return;
    }
    
    const args = query.data.split(';');
    switch(args[0]){
        case CommandShorts.Name:
        case `${CommandShorts.Name}@${botUser.username}`:
            return CommandShorts.onCallbackQuery(bot,  query, args);
        case CommandChatGPT.Name: 
        case `${CommandChatGPT.Name}@${botUser.username}`:
            return CommandChatGPT.onCallbackQuery(bot,  query, args);
        case "test":
            return CommandTest.onCallbackQuery(bot, query, args);
    }
}