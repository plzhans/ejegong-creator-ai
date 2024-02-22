import { FieldSet, Record, Table} from "airtable";
import { QuoteDto } from "../datatypes/QuoteDto";
import { AirtableSchemaOptions } from "../datatypes/Common";
import { createLogger } from "../lib/logger";
import path from "path";

const logger = createLogger(path.basename(__filename, path.extname(__filename)));

export interface QuoteRepo {
    get_ready_one():Promise<QuoteDto | undefined>;
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
                subject: record.get("주제")?.toString(),
                contentCount: Number(record.get("명언 수")?.toString()) || 0,
                contentsKor: record.get("내용")?.toString(),
                contentsEng: record.get("내용_영어")?.toString(),
                telegram_message_id: record.get("Telegram_message_id")?.toString(),
                imageStatus: record.get("image_status")?.toString(),
                //images: record.get("")?.toString(),
            };
            return data;
        }
        return undefined;
    }

    async update(recordId:string, input: QuoteDto): Promise<QuoteDto | undefined> {
        const base = this.getDefaultBase();

        let data:any = {};
        if (input.imageStatus) {
            data.image_status = input.imageStatus;
        }
        if (input.images) {
            data.images = input.images;
        }

        let result = await base.update(recordId, data);
        let dto = this.parseQuoteDto(result)
        return dto;
    }

    async get_ready_one():Promise<QuoteDto | undefined> {

        try {
            const base = this.getDefaultBase();

            let records = await base.select({
                maxRecords: 1,
                filterByFormula: "AND({image_status}=\"ready\",{주제},{내용},{내용_영어})"
            }).firstPage();

            if(records && records.length > 0) {
                return this.parseQuoteDto(records[0]);                
            } 
        } catch(err){
            logger.error(err);
        }
        return undefined;
    }
}
