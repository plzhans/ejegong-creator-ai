import TelegramBot from "node-telegram-bot-api";
import { isEmpty } from "lodash";
import Airtable, { FieldSet } from "airtable";
import { getAppConfig } from "../config";
import { BaseLogger, QutoeStatus } from "service-base";
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

    export const Name = "/shorts";

    export enum CallbackTypes {
        CALLBACK_CONTENT_REQUEST = "001"
    }

    export function getMyCommands():TelegramBot.BotCommand[]{
        return [
            {command:Name , description: "명언"}
        ]
    }

    export async function onMessage({ bot, msg, metadata }: { bot: TelegramBot; msg: TelegramBot.Message; metadata: TelegramBot.Metadata | undefined;}){
        const commands = msg.text?.split(' ');
        if(commands){
            switch (commands[1]){
                case "create": {
                    const config = getAppConfig();
                    const defaultChatId = config.telegram.bot.default_chat_id;
                    const subject_title = commands.slice(2).join(' ');
                    const subject_count = 7;
                    if(isEmpty(subject_title)) {
                        return;
                    }
    
                    const message = [
                        `[Make] 명언 생성 자동화`,
                        `>> 상태 : 주제 등록 준비`,
                        `>> 주제 : ${subject_title}, ${subject_count}개`,
                        //`>> record_id : ${record.getId()}`,
                    ].join('\n');
                    
                    bot.sendMessage(defaultChatId, message).then(msg=>{
                        const table = getQuoteTable();
                        table.create({
                            "주제": subject_title,
                            "명언 수": subject_count.toString(),
                            "telegram_chat_id": msg.chat.id.toString(),
                            "Telegram_message_id": msg.message_id.toString(),
                            "status": "ready"
                        }).then(record=>{
                            const message = [
                                `[Make] 명언 생성 자동화`,
                                `>> 상태 : 주제 등록 완료`,
                                `>> 주제 : ${subject_title}, ${subject_count}개`,
                                `>> record_id : ${record.getId()}`,
                            ].join('\n');
                            bot.editMessageText(message, {
                                chat_id: msg.chat.id,
                                message_id: msg.message_id,
                                reply_markup: {
                                    inline_keyboard: [[{
                                        text: "Retry",
                                        callback_data: [commands[0], CallbackTypes.CALLBACK_CONTENT_REQUEST, record.id].join(';')
                                    }]]
                                }
                            }).then(msg=>{
                                EjeCreator.sendStep(QutoeStatus.Content_Request,record.getId())
                                .then(res=>{
                                    logger.info(`EjeCreator.sendContentRequest(): ok. ${res}`);
                                })
                                .catch(err=>{
                                    logger.error(`EjeCreator.sendContentRequest(): error. ${err}`);
                                });
                            })
                            .catch(err=>{
                                logger.error(`editMessageText(): error. ${err}`);
                            });
                        }).catch(err=>{
                            bot.sendMessage(defaultChatId, `${msg.text}\n\n[Error] table.create(): error. ${err}`);
                            logger.error(`table.create(): error. ${err}`);
                        })
                    }).catch(err=>{
                        logger.error(`sendMessage(): error. ${err}`);
                    });
                } break;
                
                default: 
                    break;
            }
        }
        
    }

    export function onCallbackQuery(bot:TelegramBot, query:TelegramBot.CallbackQuery, args:string[]){
        switch (args[1]){
            case CallbackTypes.CALLBACK_CONTENT_REQUEST: {
                
                const record_id = args[2];
                if(isEmpty(record_id)){
                    if(query.message?.chat.id){
                        bot.sendMessage(query.message?.chat.id, "Invalid param. record_id", {
                            reply_to_message_id: query.message?.message_id
                        })
                    }
                    return;
                }

                EjeCreator.sendStep(QutoeStatus.Content_Request, record_id)
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