import Airtable, {FieldSet, Record, Table} from "airtable";
import { config, AirtableConfig } from "../config";
import { QuoteDto } from "../datatypes/QuoteDto";

interface QuoteRepo {
    get_ready_one():Promise<QuoteDto | null>;
    update(recordId:string, data:QuoteDto):Promise<QuoteDto | null>;
}

export class QuoteRepoImpl implements QuoteRepo {

    private _airtable:Airtable;
    private _airtable_opt:AirtableConfig;

    constructor(opt:AirtableConfig) {
        this._airtable_opt = opt;
        this._airtable = new Airtable({
            apiKey: opt.token,
        });
    }

    getDefaultBase(): Table<FieldSet>{
        const baseName = this._airtable_opt.schema.quote.base;
        const tableName = this._airtable_opt.schema.quote.table;
        const base = this._airtable.base(baseName).table(tableName);
        return base;
    }

    parseQuoteDto(record: Record<FieldSet>): QuoteDto | null {
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
        return null;
    }

    async update(recordId:string, input: QuoteDto): Promise<QuoteDto | null> {
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

    async get_ready_one():Promise<QuoteDto | null> {

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
            console.error(err);
        }
        return null;
    }

}

export const QuoteRepoInst:QuoteRepo = new QuoteRepoImpl(config.airtable);

