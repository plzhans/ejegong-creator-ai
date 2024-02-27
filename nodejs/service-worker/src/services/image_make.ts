import { isEmpty } from "lodash";
import { QuoteDomain } from "../domains/QuoteDomain";
import { QuoteImageDomain } from "../domains/QuoteImageDoamin";
import { createLogger } from "../lib/logger";
import { UrlAttachment } from "../datatypes/Common";
import EjeCreator from "../lib/ejecreator";

export async function processImageMake(domain:QuoteDomain){
    const logger = createLogger("processQuoteMake", {record_id: domain.getId()});

    if(!domain.isContents()) {
        await domain.processError("Empty contents");
        return;
    }

    if(domain.getContentCount() < 1 ){
        await domain.processError("Invaild ContentCount.");
        return;
    }

    const arrayContentsEng = domain.getContentsEng();
    if (arrayContentsEng.length != domain.getContentCount()) {
        await domain.processError(`Invalid contents_eng count. length=${arrayContentsEng.length}, count=${domain.getContentCount()}`);
        return;
    }

    const arrayContentsKor = domain.getContentsKor();
    if (arrayContentsKor.length != domain.getContentCount()) {
        await domain.processError(`Invalid contents_kor. length=${arrayContentsKor.length}, count=${domain.getContentCount()}`);
        return;
    }

    // 기존 이미지 프로세싱 데이터 불러오기
    let imageMap = await domain.getImageMap();
    for(let loopIndex=0; loopIndex < domain.getContentCount(); loopIndex++){
        const quotesIndex = loopIndex + 1;
        let contentsEngSplit = arrayContentsEng[loopIndex].split('|');
        if(contentsEngSplit.length < 2) {
            domain.getLogger().error(`QuoteImage[${loopIndex}]: content_eng invalid split.`);
            break;
        }
        let contentsKorSplit = arrayContentsKor[loopIndex].split('|');
        if(contentsKorSplit.length < 2) {
            domain.getLogger().error(`QuoteImage[${loopIndex}]: content_kor invalid split.`);
            break;
        }

        let contents = contentsEngSplit[0];
        if(isEmpty(contents)){
            domain.getLogger().error(`QuoteImage[${loopIndex}]: empty content_eng.`);
            break;
        }

        // make.com의 모듈이 array가 1부터 시작하기때문에 quotesIndex는 1로 시작.
        const key = `${domain.getId()}:${quotesIndex}`;
        let quoteImage = imageMap.get(key);
        if(quoteImage){
            if(!quoteImage.equalsQuoteTextEng(contents)){
                const removeResult = await quoteImage.remove();
                if(!removeResult){
                    logger.error(`QuoteImage[${loopIndex}]: quoteImage.remove(): fail.`);
                    break;
                }
                quoteImage = undefined;
            }
        }
        if(!quoteImage){
            quoteImage = await QuoteImageDomain.new({
                recordId: "",
                parentId: domain.getId(),
                quotesIndex: quotesIndex,
                quotesText: contentsKorSplit[0],
                author: contentsKorSplit[1],
                quotesTextEng: contentsEngSplit[0],
                authorEng: contentsEngSplit[1],
                status: "ready",
                //updated: string,
            });
            if(!quoteImage){
                logger.error(`QuoteImage[${loopIndex}]: QuoteImageRepo insert error.`);
                break;
            }
        }
        imageMap.set(key, quoteImage);
    }

    if(imageMap.size != domain.getContentCount()){
        await domain.processError("Invalid map size. length=${imageMap.size}, count=${quote.contentCount}");
        return;
    }

    const imageArray = Array.from(imageMap.values()).sort((a, b) => (a.getQuotesIndex()) - (b.getQuotesIndex()));
    const promises = new Array<Promise<UrlAttachment>>();
    imageArray.map(quoteImage=>{
        promises.push(processMidjourneyMake(domain, quoteImage));
    });

    const finalImages = await Promise.all(promises);
    await domain.processImageCompleted(finalImages);

    await domain.sendCompletedMessage();
    await EjeCreator.sendImageConfirmYes(domain.getId());

    await domain.processVideoReady();
}

async function processMidjourneyMake(quote:QuoteDomain, quoteImage:QuoteImageDomain):Promise<UrlAttachment>{
    if(!quoteImage.isQuoteTextEng()){
        return {};
    }
    
    if(quoteImage.isCompleted() && quoteImage.isImageUrl()){
        return {url: quoteImage.getImageUrl()};
    } 

    while(true) {
        if(!quoteImage.getMidjourneyJobId()){
            const imagineResult = await quoteImage.sendMidjourneyImagine();
            if (imagineResult == 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * 20));
            } else if( imagineResult == 2 ) {
                // Too Many Requests
                await new Promise(resolve => setTimeout(resolve, 1000 * 30));
            } else {
                await quote.processError(`image.processImagine(): fail. code=${imagineResult}`);
                return {};
            }   
        } else {
            const jobRes = await quoteImage.getMidjourneyJob();
            if(!jobRes.isOk()){
                await quote.processError("quoteImage.getMidjourneyJob(): fail.");
                return {};
            }
            switch(jobRes.status) {
                case "completed":
                    switch(jobRes.verb){
                        case "imagine":
                            const scaleUpResult = await quoteImage.sendMidjourneyScaleUp();
                            if( scaleUpResult == 1){
                                // Imagine 대비 빨리 끝난다. (Imagine 대기 시간보다 짧게)
                                await new Promise(resolve => setTimeout(resolve, 1000 * 10));
                            } else if( scaleUpResult == 2 ) {
                                // Too Many Requests
                                await new Promise(resolve => setTimeout(resolve, 1000 * 30));
                            } else {
                                await quote.processError(`quoteImage.sendMidjourneyScaleUp(): fail. code=${scaleUpResult}`);
                                return {};
                            }
                            break;
                        case "button":
                            const processCompletedResult = await quoteImage.processCompleted(jobRes);
                            if(processCompletedResult == 1) {
                                return {url:  quoteImage.getImageUrl()}
                            } else {
                                await quote.processError(`quoteImage.processCompleted(): fail. code={processCompletedResult}`);
                                return {};
                            }
                        default:
                            await quote.processError(`Invalid job verb. jobId=${jobRes.jobid}, verb=${jobRes.verb}`);
                            return {};
                    }
                    break; 
                case "created":
                case "started":
                case "moderated":
                case "progress":
                    await new Promise(resolve => setTimeout(resolve, 1000 * 20));
                    break;
                default:
                    quote.processError(`MidjourneyApi.getJob fail. jobId=${quoteImage.getMidjourneyJobId()}, status=${jobRes.status}`);
                    return {};
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    } // while
}
