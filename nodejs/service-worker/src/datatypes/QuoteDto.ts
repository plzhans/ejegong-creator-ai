import { QutoeStatus } from "service-base";
import { UrlAttachment } from "./Common";

export interface QuoteDto {
    recordId: string;
    subject?: string;
    contentCount?: number;
    contentsKor?: string;
    contentsEng?: string;
    telegram_chat_id?: number;
    telegram_message_id?: number;
    status?: QutoeStatus;
    imageStatus?: string;
    tts?: UrlAttachment[];
    images?: UrlAttachment[];
    videoStatus?:string,
    creatomateRederId?:string;
    mediaUrl?:string;
    snapshotUrl?:string;
}

