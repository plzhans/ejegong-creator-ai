import TelegramBot from "node-telegram-bot-api";
import { BaseLogger } from "service-base";
import path from "path";
import { getOpenAI } from "../lib/openai";
import telegramBot from '../lib/telegramBot';
import { isEmpty } from "lodash";

const logger = BaseLogger.createLogger(path.basename(__filename, path.extname(__filename)));

export namespace CommandChatGPT {

    export const Name = "/chatgpt";

    export const ForceReplyText = `${CommandChatGPT.Name} 프롬프트를 입력해주세요.`;

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

        let prompt;
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

        if(msg.from.id != 58087716){
            telegramBot.getBot().sendMessage(msg.chat.id, "안알랴줌.", {
                reply_to_message_id: msg.message_id
            }).catch(err=>{
                logger.error(`telegramBot.getBot().sendMessage:(): error. ${err}`);
            })
            return;
        }
        

        const openai = getOpenAI();

        const rMsg = await telegramBot.getBot().sendMessage(msg.chat.id, "GPT에게 물어보는 중...", {
            reply_to_message_id: msg.message_id
        });

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
            }
        } else {

        }
    }

    export function onCallbackQuery(bot:TelegramBot, query:TelegramBot.CallbackQuery, args:string[]){
        
    }
}

export default CommandChatGPT;  