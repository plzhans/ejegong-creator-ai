import TelegramBot from "node-telegram-bot-api";
import { isEmpty } from "lodash";
import Airtable, { FieldSet } from "airtable";
import { getAppConfig } from "../config";
import { BaseLogger } from "service-base";
import path from "path";
import EjeCreator from "../lib/ejecreator";

const logger = BaseLogger.createLogger(path.basename(__filename, path.extname(__filename)));

let _airtable:Airtable|undefined = undefined;
function getQuoteTable():Airtable.Table<FieldSet>{
    const config = getAppConfig();
    const baseTable = config.airtable.tables.quote.split('/');
    if(!_airtable){
        _airtable = new Airtable({
            apiKey: config.airtable.token
        });
    }
    const table = _airtable.base(baseTable[0]).table(baseTable[1]);
    return table;
}


export namespace CommandShorts {

    export async function onMessage(bot:TelegramBot, msg:TelegramBot.Message, metadata:TelegramBot.Metadata|undefined, commands:string[]){
        switch (commands[1]){
            case "create": {
                const subject_title = commands.slice(2).join(' ');
                if(isEmpty(subject_title)) {
                    return;
                }

                const table = getQuoteTable();
                table.create({
                    "주제": subject_title,
                    "명언 수": "7",
                    "Telegram_message_id": msg.message_id.toString(),
                    "status": "ready"
                }).then(record=>{
                    bot.editMessageText(`${msg.text}\n\n`, {
                        chat_id: msg.chat.id,
                        message_id: msg.message_id,
                        reply_markup: {
                            inline_keyboard: [[{
                                text: "컨텐츠 생성",
                                callback_data: [commands[0], '001',record.id].join(';')
                            }]]
                        }
                    }).catch(err=>{
                        logger.error(`deleteMessage(): error. ${err}`);
                    });
                }).catch(err=>{
                    bot.editMessageText(`${msg.text}\n\n[Error] table.create(): error. ${err}`, {
                        chat_id: msg.chat.id,
                        message_id: msg.message_id
                    });
                    logger.error(`table.create(): error. ${err}`);
                })
               
                // EjeCreator.sendContentRequest(subject_title, 7)
                //     .then((_res) =>{
                //         bot.deleteMessage(msg.chat.id, msg.message_id).catch(err=>{

                //         });
                //     });
            } 
            break;
        }
    }

    export function onCallbackQuery(bot:TelegramBot, query:TelegramBot.CallbackQuery, args:string[]){
        switch (args[1]){
            case "001": {
                
                const record_id = args[2];
                if(isEmpty(record_id)){
                    if(query.message?.chat.id){
                        bot.sendMessage(query.message?.chat.id, "Invalid param. record_id", {
                            reply_to_message_id: query.message?.message_id
                        })
                    }
                    return;
                }

                EjeCreator.sendContentRequest(record_id, query.message?.message_id)
                    .then(res=>{
                        logger.info(`EjeCreator.sendContentRequest(): ok. ${res}`);
                    })
                    .catch(err=>{
                        logger.error(`EjeCreator.sendContentRequest(): error. ${err}`);
                    });
            }
            break;
        }
        bot.answerCallbackQuery(query.id).catch(err=>{
            logger.error(`bot.answerCallbackQuery(): error. ${err}`);
        });
    }
}

export default CommandShorts;  