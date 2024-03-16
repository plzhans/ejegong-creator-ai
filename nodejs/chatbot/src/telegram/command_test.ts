import TelegramBot from "node-telegram-bot-api";

export namespace CommandTest {

    export function onMessage(bot:TelegramBot, msg:TelegramBot.Message, metadata:TelegramBot.Metadata|undefined, commands:string[]){
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
            } 
            break;
        }
    }

    export function onCallbackQuery(bot:TelegramBot, query:TelegramBot.CallbackQuery, args:string[]){
        
    }
}

export default CommandTest;  