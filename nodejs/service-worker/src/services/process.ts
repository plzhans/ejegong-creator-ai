import { QuoteDomain } from "../domains/QuoteDomain";
import { ConfigRepo, QuoteRepo } from "../repository/repo";
import { QutoeStatus } from "../datatypes/QuoteDto";
import { processImageMake } from "./image_make";
import { processVideoMake } from "./video_make";

export async function isProcessEnabled():Promise<boolean>{
    let enabeld = await ConfigRepo().getBoolean("system.service_worker.enable");
    return enabeld ?? false;
}

export async function getProcessData(): Promise<QuoteDomain | undefined>{
    
    let entity = await QuoteRepo().getReadyOne();
    if(entity){
        return new QuoteDomain(entity);
    }
    return undefined;
}

export async function processNext(quote:QuoteDomain){
    switch(quote.getStatus()){
        case QutoeStatus.Content_Completed:{
            await processImageMake(quote);
        } break;
        // case QutoeStatus.Ready:{
        //     await processVideoMake(quote);
        // } break;
    }
}
