import { UrlAttachment } from "./Common";

export interface QuoteDto {
    recordId: string;
    subject?: string;
    contentCount?: number;
    contentsKor?: String;
    contentsEng?: String;
    telegram_message_id?: String;
    imageStatus?: String;
    images?: UrlAttachment[];
}