import TelegramBot from "node-telegram-bot-api";
import { BaseLogger } from "service-base";
import path from "path";
import { getOpenAI } from "../lib/openai";
import telegramBot from '../lib/telegramBot';
import { isEmpty } from "lodash";
import UserRole from "../lib/userRole";

const logger = BaseLogger.createLogger(path.basename(__filename, path.extname(__filename)));

export namespace CommandChatGPT {

    export const Name = "/chatgpt";

    export const ForceReplyText = `${Name} 프롬프트를 입력해주세요.`;

    export enum CallbackTypes {
        
    }

    const defaultModel = "gpt-3.5-turbo";

    export function getMyCommands():TelegramBot.BotCommand[]{
        return [
            {command:Name , description: `OepnAI ChatGPT - default model ${defaultModel}`}
        ]
    }

    export async function onMessage({ bot, msg, metadata }: { bot: TelegramBot; msg: TelegramBot.Message; metadata: TelegramBot.Metadata | undefined;}){
        if(!msg.text){
            return;
        }
        if(!msg.from || msg.from.is_bot){
            return;
        }

        if(!await UserRole.isPermission('chatgpt', msg.chat.id, msg.from)){
            telegramBot.getBot().sendMessage(msg.chat.id, `권한이 없습니다.\n>> user: ${msg.from.username}(${msg.from.id})`,{
                reply_to_message_id: msg.message_id
            }).catch(err=>{
                logger.error(`telegramBot.getBot().deleteMessage:(): error. ${err}`);
            });
            return;
        }

        let prompt:string;
        if(msg.reply_to_message?.text === ForceReplyText){
            telegramBot.getBot().deleteMessage(msg.chat.id, msg.reply_to_message.message_id).catch(err=>{
                logger.error(`telegramBot.getBot().deleteMessage:(): error. ${err}`);
            });

            prompt = msg.text;
            if(isEmpty(prompt)){
                return;
            }
        } else {
            prompt = msg.text.split(' ').slice(1).join(' ');
            if(isEmpty(prompt)){
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

        if(prompt.length < 3){
            telegramBot.getBot().sendMessage(msg.chat.id, "길게 입력해줘.", {
                reply_to_message_id: msg.message_id
            }).catch(err=>{
                logger.error(`telegramBot.getBot().sendMessage:(): error. ${err}`);
            })
            return;
        }

        const rMsg = await telegramBot.getBot().sendMessage(msg.chat.id, "GPT에게 물어보는 중...", {
            reply_to_message_id: msg.message_id
        });

        const openai = getOpenAI();
        const completion = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: "대답은 반말. 명사 위주의 단답형." },
                { role: 'user', content: prompt }
            ],
            model: defaultModel,
        });

        if(completion.choices.length > 0){
            const text = completion.choices[0].message.content;
            if(text) {
                await telegramBot.getBot().editMessageText(text, {
                    chat_id: rMsg.chat.id,
                    message_id: rMsg.message_id,
                });
            } else {
                await telegramBot.getBot().editMessageText("나도 몰라~", {
                    chat_id: rMsg.chat.id,
                    message_id: rMsg.message_id,
                });
            }
        } else {
            await telegramBot.getBot().editMessageText("나도 몰라~~", {
                chat_id: rMsg.chat.id,
                message_id: rMsg.message_id,
            });
        }
    }

    export function onCallbackQuery(bot:TelegramBot, query:TelegramBot.CallbackQuery, _args:string[]){
        bot.answerCallbackQuery(query.id).catch(err=>{
            logger.error(`bot.answerCallbackQuery(): error. ${err}`);
        });
    }
}

export default CommandChatGPT;  