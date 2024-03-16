import { FieldSet, Record, Table} from "airtable";
import { QuoteDto, QutoeStatus } from "../datatypes/QuoteDto";
import { AirtableSchemaOptions, UrlAttachment } from "../datatypes/Common";
import { createLogger } from "../lib/logger";
import path from "path";

const logger = createLogger(path.basename(__filename, path.extname(__filename)));

export interface QuoteRepo {
    getReadyOne():Promise<QuoteDto | undefined>;
    update(recordId:string, data:QuoteDto):Promise<QuoteDto | undefined>;
}

export class QuoteRepoImpl implements QuoteRepo {
    options:AirtableSchemaOptions;

    constructor(options:AirtableSchemaOptions) {
        this.options = options;
    }

    getDefaultBase(): Table<FieldSet>{
        const airtable = this.options.getAirtable();
        const base = airtable.base(this.options.baseId).table(this.options.tableId);
        return base;
    }

    parseQuoteDto(record: Record<FieldSet>): QuoteDto | undefined {
        let record_id = record.get("RECORD_ID")?.toString();
        if (record_id){
            let data:QuoteDto = {
                recordId: record_id,
                status: record.get("status")?.toString() as QutoeStatus,
                subject: record.get("주제")?.toString(),
                contentCount: Number(record.get("명언 수")?.toString()) || 0,
                contentsKor: record.get("내용")?.toString(),
                contentsEng: record.get("내용_영어")?.toString(),
                telegram_message_id: Number(record.get("Telegram_message_id")?.toString() || ""),
                imageStatus: record.get("image_status")?.toString(),
                tts: record.get("tts") as UrlAttachment[],
                images: record.get("images") as UrlAttachment[],
                creatomateRederId: record.get("Creatomate_reder_id")?.toString(),
                mediaUrl: record.get("Media URL")?.toString(),
                snapshotUrl: record.get("Snapshot URL")?.toString(),
            };
            return data;
        }
        return undefined;
    }

    async getReadyOne():Promise<QuoteDto | undefined> {
        const filter = `{status}=\"${QutoeStatus.Content_Completed}\"`;
        try {
            const base = this.getDefaultBase();

            let records = await base.select({
                maxRecords: 1,
                filterByFormula: filter
            }).firstPage();

            if(records && records.length > 0) {
                return this.parseQuoteDto(records[0]);                
            } 
        } catch(err){
            logger.error(err);
        }
        return undefined;
    }

    async update(recordId:string, input: QuoteDto): Promise<QuoteDto | undefined> {
        const base = this.getDefaultBase();

        let data:any = {};
        if (input.status) {
            data.status = input.status;
        }
        if (input.imageStatus) {
            data.image_status = input.imageStatus;
        }
        if (input.images) {
            data.images = input.images;
        }
        if(input.telegram_chat_id){
            data.telegram_chat_id = input.telegram_chat_id?.toString();
        }
        if(input.telegram_message_id){
            data.Telegram_message_id = input.telegram_message_id?.toString();
        }
        let result = await base.update(recordId, data);
        let dto = this.parseQuoteDto(result)
        return dto;
    }
}
