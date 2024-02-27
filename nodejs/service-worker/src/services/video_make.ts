import { getAppConfig } from "../config";
import { QuoteDomain } from "../domains/QuoteDomain";
import { QuotationRenderRequest, quotationFetchRender, quotationStartRender } from "../lib/creatomate";
import { sleep } from "../lib/taskLib";

export async function processVideoMake(domain:QuoteDomain){
    const entity = domain.getEntity();
    while(true){
        if(!entity.creatomateRederId){
            const videoMake = domain.getVideoMakeData();
            const renderReq = new QuotationRenderRequest();
            for(let i=0; i<videoMake.Count; i++){
                renderReq.quotations.push({
                    quotation: videoMake.korContents[i].quotation,
                    name: videoMake.korContents[i].name,
                    source: videoMake.korContents[i].source,
                    bg_image: videoMake.backgroundImage[i],
                });
            }
            
            const rederRes = await quotationStartRender(renderReq);
            const result = await domain.processVideoMaking(rederRes);

            await sleep(1000*30);
        } else {
            quotationFetchRender(entity.creatomateRederId)

            await sleep(1000*10);
        }
    }
}