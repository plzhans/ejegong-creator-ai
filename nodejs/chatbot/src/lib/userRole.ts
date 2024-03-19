import TelegramBot from "node-telegram-bot-api";

export type RoleType = 'shorts' | 'chatgpt';

export namespace UserRole {
    export async function isPermission(action:RoleType, chat_id:number|undefined, user:TelegramBot.User): Promise<boolean> {
        return user.id == 58087716;
    }
}

export default UserRole;