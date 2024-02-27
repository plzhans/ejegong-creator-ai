import * as Creatomate from 'creatomate'
import { getAppConfig } from '../config';

export class QuotationRenderRequest {
    quotations:QuotationOption[];

    constructor(){
        this.quotations = new Array<QuotationOption>();
    }
}

export interface QuotationOption {
    quotation?:string,
    name?: string,
    source?:string,
    bg_image?: string,
}

let client:Creatomate.Client|undefined = undefined;
export function creatomate(): Creatomate.Client {
    const config = getAppConfig();

    if(!client){
        client = new Creatomate.Client(config.creatomate.api_key);
    }
    return client;
}


export async function render(properties:Creatomate.SourceProperties): Promise<Creatomate.Render[]> {
    const source = new Creatomate.Source(properties);
    const client = creatomate();
    const results = await client.render({ source });
    return results;
}

export async function quotationStartRender(request:QuotationRenderRequest): Promise<Creatomate.Render> {
    const config = getAppConfig();

    const options:Creatomate.RenderOptions = {
        templateId: config.creatomate.template_id
    }

    if(request.quotations) {
        request.quotations.forEach((data, index) => {
            const no = index+1;
            if(!options.modifications){
                options.modifications = {};
                console.debug("new!!");
            }
            options.modifications[`quotation_${no}`] = data.quotation ?? "";
            options.modifications[`speaker_name_${no}`] = data.name ?? "";;
            options.modifications[`quotation_source_${no}`] = data.source ?? "";
            options.modifications[`$bg_image_{no}`] = data.bg_image ?? "";
        });
    } 

    const client = creatomate();
    const results = await client.startRender(options);
    return results[0];
}

export async function quotationFetchRender(id:string): Promise<Creatomate.Render> {
    const client = creatomate();
    const result = await client.fetchRender(id);
    return result;
}