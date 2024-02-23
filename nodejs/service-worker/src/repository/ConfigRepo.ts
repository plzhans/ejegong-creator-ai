import { FieldSet, Record, Table} from "airtable";
import { AirtableSchemaOptions } from "../datatypes/Common";
import { createLogger } from "../lib/logger";
import path from "path";

const logger = createLogger(path.basename(__filename, path.extname(__filename)));

export interface ConfigRepo {
    getString(name:string):Promise<string | undefined>;
    getNumber(name:string):Promise<number | undefined>;
    getBoolean(name:string):Promise<boolean | undefined>;
}

export class ConfigRepoImpl implements ConfigRepo {
    options:AirtableSchemaOptions;

    constructor(options:AirtableSchemaOptions) {
        this.options = options;
    }

    getDefaultBase(): Table<FieldSet>{
        const airtable = this.options.getAirtable();
        const base = airtable.base(this.options.baseId).table(this.options.tableId);
        return base;
    }

    async getString(name:string):Promise<string | undefined> {
        try {
            const base = this.getDefaultBase();

            let records = await base.select({
                filterByFormula: `{Name}=\"${name}\"`,
                maxRecords: 1,
            }).firstPage();

            if(records && records.length > 0) {
                const data = records[0].get("Value")?.toString();
                return data;
            } 
        } catch(err){
            logger.error(err);
        }
        return undefined;
    }

    async getNumber(name:string):Promise<number | undefined> {
        const value = await this.getString(name);
        if(value){
            const number = Number(value);
            if(!isNaN(number)){
                return number;
            }
        }
        return undefined;
    }

    async getBoolean(name:string):Promise<boolean | undefined> {
        const value = await this.getString(name);
        if(value){
            return "true" === value.toLocaleLowerCase();
        }
        return undefined;
    }
}
