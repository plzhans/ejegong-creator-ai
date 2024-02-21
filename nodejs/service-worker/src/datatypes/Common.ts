import Airtable from "airtable";

export interface UrlAttachment{
    id?: string;
    url?: string;
    filename?: string;
    size?: number;
    type?: string;
}

export class AirtableSchemaOptions {
    airtable:Airtable;
    baseId:string;
    tableId:string;

    constructor(apiKey:string, baseTable:string){
        this.airtable = new Airtable({
            apiKey: apiKey
        });
        const split = baseTable.split('/');
        if(split.length > 2){
            throw new Error(`Invalid baseTable. name=${baseTable}`);
        }
        this.baseId = split[0];
        this.tableId = split[1];
    }

    public getAirtable() { return this.airtable;}
    public getBaseId() { return this.baseId;}
    public getTableId() { return this.tableId;}
}