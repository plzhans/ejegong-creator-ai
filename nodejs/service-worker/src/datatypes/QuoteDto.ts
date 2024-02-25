import { UrlAttachment } from "./Common";

export interface QuoteDto {
    recordId: string;
    subject?: string;
    contentCount?: number;
    contentsKor?: string;
    contentsEng?: string;
    telegram_message_id?: number;
    imageStatus?: string;
    images?: UrlAttachment[];
}