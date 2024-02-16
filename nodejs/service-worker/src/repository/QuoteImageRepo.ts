import Airtable, {FieldSet, Record, Table} from "airtable";
import { config, AirtableConfig } from "../config";
import { QutoeImageDto } from "../datatypes/QuoteImageDto";
import { UrlAttachment } from "../datatypes/Common";

interface QuoteImageRepo {
    get(recordId: string): Promise<QutoeImageDto|undefined>;
    getListByParentRecordId(recordId: string, maxRecords: number): Promise<Array<QutoeImageDto>>;
    insert(data:QutoeImageDto):Promise<QutoeImageDto | undefined>;
    update(recordId:string, data:QutoeImageDto):Promise<QutoeImageDto | undefined>;
    remove(recordId:string):Promise<QutoeImageDto|undefined>;
}

export class QuoteImageRepoImpl implements QuoteImageRepo {

    private _airtable:Airtable;
    private _airtable_opt:AirtableConfig;

    constructor(opt:AirtableConfig) {
        this._airtable_opt = opt;
        this._airtable = new Airtable({
            apiKey: opt.token,
        });
    }
    
    parseQuoteImageDto(record: Record<FieldSet>): QutoeImageDto | undefined {
        let record_id = record.get("record_id")?.toString();
        if (record_id){
            let data:QutoeImageDto = {
                recordId: record_id,
                parentId: record.get("quotes_record_id")?.toString(),
                quotesIndex: Number(record.get("quotes_index")?.toString()) || 0,
                quotesText: record.get("quotes_text")?.toString(),
                author: record.get("author")?.toString(),
                quotesTextEng: record.get("quotes_text_eng")?.toString(),
                authorEng: record.get("author_eng")?.toString(),
                status: record.get("status")?.toString(),
                updated: record.get("updated")?.toString(),
                midjourneyJobId: record.get("midjourney_job_id")?.toString(),
                imageWidth: Number(record.get("image_width")?.toString()) || 0,
                imageHeight: Number(record.get("image_height")?.toString()) || 0,
                imageSize: Number(record.get("image_size")?.toString()) || 0
            };

            let images = record.get("images") as readonly Airtable.Attachment[];
            if(images){
                data.images = images.reduce((list, attach)=>{
                    list.push({
                        id: attach.id,
                        url: attach.url,
                        filename: attach.filename,
                        size: attach.size,
                        type: attach.type
                    });
                    return list;
                }, new Array<UrlAttachment>());
            }
            return data;
        }
        return undefined;
    }

    async insert(input: QutoeImageDto): Promise<QutoeImageDto | undefined> {
        const base = this.getDefaultBase();

        let data:any = {
            parent_id: input.parentId,
            quotes_index: input.quotesIndex,
            quotes_text: input.quotesText,
            author: input.author,
            quotes_text_eng: input.quotesTextEng,
            author_eng: input.authorEng,
            status: input.status,
            images: input.images,
            //updated: string,
            midjourney_job_id: input.midjourneyJobId,
            image_width: input.imageWidth,
            image_height: input.imageHeight,
            image_size: input.imageSize
        };

        const result = await base.create(input.recordId, data);
        const dto = this.parseQuoteImageDto(result)
        return dto;
    }

    async update(recordId:string, input: QutoeImageDto): Promise<QutoeImageDto | undefined> {
        const base = this.getDefaultBase();

        let data:any = {};
        //data.updated = string;
        if(input.parentId){
            data.parent_id = input.parentId;
        }
        if(input.quotesIndex){
            data.quotes_index = input.quotesIndex.toString();
        }
        if(input.quotesText){
            data.quotes_text = input.quotesText;
        }
        if(input.author){
            data.author = input.author;
        }
        if(input.quotesTextEng){
            data.quotes_text_eng = input.quotesTextEng;
        }
        if(input.authorEng){
            data.author_eng = input.authorEng;
        }
        if (input.status) {
            data.status = input.status;
        }
        if(input.midjourneyJobId){
            data.midjourney_job_id = input.midjourneyJobId;
        }
        if (input.images) {
            data.images = input.images;
        }
        if(input.imageWidth){
            data.image_width = input.imageWidth.toString();
        }
        if(input.imageHeight){
            data.image_height = input.imageHeight.toString();
        }
        if(input.imageSize){
            data.image_size = input.imageSize.toString();
        }

        const result = await base.update(recordId, data);
        const dto = this.parseQuoteImageDto(result)
        return dto;
    }

    async remove(recordId: string): Promise<QutoeImageDto|undefined> {
        const base = this.getDefaultBase();

        const result = await base.destroy(recordId);
        const dto = this.parseQuoteImageDto(result)
        return dto;
    }

    getDefaultBase(): Table<FieldSet>{
        const baseName = this._airtable_opt.schema.quote_image.base;
        const tableName = this._airtable_opt.schema.quote_image.table;
        const base = this._airtable.base(baseName).table(tableName);
        return base;
    }

    async get(recordId: string): Promise<QutoeImageDto|undefined> {
        const base = this.getDefaultBase();

        let record = await base.find(recordId);
        return this.parseQuoteImageDto(record);
    }

    async getListByParentRecordId(recordId: string, maxRecords: number): Promise<Array<QutoeImageDto>> {
        const base = this.getDefaultBase();

        let list = new Array<QutoeImageDto>();
        await base.select({
            maxRecords: maxRecords,
            filterByFormula: `{quotes_record_id}=\"${recordId}\"`
        }).eachPage((records,next)=>{
            records.forEach(record=>{
                let data = this.parseQuoteImageDto(record);
                if(data){
                    list.push(data);    
                }
            });
            next();
        }).catch(err => {
            console.error(err);
            list.length = 0;
        })
        return list;
    }
}

export const QuoteImageRepoInst:QuoteImageRepo = new QuoteImageRepoImpl(config.airtable);
