import TelegramBot from "node-telegram-bot-api";
import { isEmpty } from "lodash";
import Airtable, { FieldSet } from "airtable";
import { getAppConfig } from "../config";
import { BaseLogger, QutoeStatus } from "service-base";
import path from "path";
import EjeCreator from "../lib/ejecreator";
import UserRole from "../lib/userRole";
import telegramBot from "../lib/telegramBot";

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

    export const Name = "/shorts_quotes";

    export const ForceReplyText = `${Name} 주제를 입력해주세요.`;

    export enum CallbackTypes {
        NextStep = "A-000",
    }

    export function getMyCommands():TelegramBot.BotCommand[]{
        return [
            {command:Name , description: "youtube shorts 명언 주제로 생성"}
        ]
    }

    export async function onMessage({ bot, msg, metadata }: { bot: TelegramBot; msg: TelegramBot.Message; metadata: TelegramBot.Metadata | undefined;}){
        if(!msg.text){
            return;
        }
        if(!msg.from || msg.from.is_bot){
            return;
        }

        const commands = msg.text?.split(' ');
        if(!commands){
            return;
        }

        if(!await UserRole.isPermission('shorts', msg.chat.id, msg.from)){
            telegramBot.getBot().sendMessage(msg.chat.id, `권한이 없습니다.\n>> user: ${msg.from.username}(${msg.from.id})`,{
                reply_to_message_id: msg.message_id
            }).catch(err=>{
                logger.error(`telegramBot.getBot().deleteMessage:(): error. ${err}`);
            });
            return;
        }
       
        let subjectTitle:string;
        if(msg.reply_to_message?.text === ForceReplyText){
            telegramBot.getBot().deleteMessage(msg.chat.id, msg.reply_to_message.message_id).catch(err=>{
                logger.error(`telegramBot.getBot().deleteMessage:(): error. ${err}`);
            });

            subjectTitle = msg.text;
            if(isEmpty(subjectTitle)){
                return;
            }
        } else {
            subjectTitle = msg.text.split(' ').slice(1).join(' ');
            if(isEmpty(subjectTitle)){
                telegramBot.getBot().sendMessage(msg.chat.id, ForceReplyText, {
                    reply_markup: {
                        force_reply: true
                    }
                }).catch(err=>{
                    logger.error(`telegramBot.getBot().sendMessage:(): error. ${err}`);
                })
                return;
            }
        }


        const subject_count = 7;

        const config = getAppConfig();
        const defaultChatId = config.telegram.bot.default_chat_id;
        const message = [
            `[Make] 명언 생성 자동화`,
            `>> 상태 : 주제 등록 준비`,
            `>> 주제 : ${subjectTitle}, ${subject_count}개`,
            //`>> record_id : ${record.getId()}`,
        ].join('\n');
        
        bot.sendMessage(defaultChatId, message).then(msg=>{
            const table = getQuoteTable();
            table.create({
                "주제": subjectTitle,
                "명언 수": subject_count.toString(),
                "telegram_chat_id": msg.chat.id.toString(),
                "Telegram_message_id": msg.message_id.toString(),
                "status": "ready"
            }).then(record=>{
                const message = [
                    `[Make] 명언 생성 자동화`,
                    `>> 상태 : 주제 등록 완료`,
                    `>> 주제 : ${subjectTitle}, ${subject_count}개`,
                    `>> record_id : ${record.getId()}`,
                ].join('\n');
                bot.editMessageText(message, {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id,
                    reply_markup: {
                        inline_keyboard: [[{
                            text: "Retry",
                            callback_data: [CallbackTypes.NextStep, config.env, record.id, QutoeStatus.Content_Request].join(';')
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
    }

    export async function onCallbackQuery(bot:TelegramBot, query:TelegramBot.CallbackQuery, args:string[]){
        bot.answerCallbackQuery(query.id).catch(err=>{
            logger.error(`bot.answerCallbackQuery(): error. ${err}`);
        });
        
        switch (args[0]){
            case CallbackTypes.NextStep:
                callbackNextStep(bot, query, args);
                break;
            default:
                break;
        }
    }

    async function callbackNextStep(bot:TelegramBot, query:TelegramBot.CallbackQuery, args:string[]){
        if(!await UserRole.isPermission('shorts', query.message?.chat.id, query.from)){
            if(query.message?.chat.id){
                bot.sendMessage(
                    query.message.chat.id, 
                    `권한이 없습니다.\n>> user: ${query.from.username}(${query.from.id})`, 
                    {
                        reply_to_message_id: query.message?.message_id
                    }
                ).catch(err=>{
                    logger.error(`bot.sendMessage(): error. ${err}`);
                })
            }
            return;
        }

        const env = args[1];
        const record_id = args[2];
        const step = args[3];
        if(isEmpty(env) || isEmpty(step) || isEmpty(record_id)){
            if(query.message?.chat.id){
                bot.sendMessage(query.message.chat.id, `요청 실패\n>>Error: Invalid callback param.\n>> args=${args.join(';')}`, {
                    reply_to_message_id: query.message?.message_id
                })
            }
            return;
        }

        EjeCreator.sendStep(step, record_id).then(res=>{
            logger.info(`EjeCreator.sendStep(): ok. ${res}`);
        }).catch(err=>{
            logger.error(`EjeCreator.sendStep(): error. ${err}`);
        });
    }
}

export default CommandShorts;  