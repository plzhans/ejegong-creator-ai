import { QuoteDto } from "./datatypes/QuoteDto";
import { QutoeImageDto } from './datatypes/QuoteImageDto';
import { isEmpty } from 'lodash';
import { midjourneyApi } from './lib/lib';
import { JobButtonRequest, JobImagineRequest } from 'useapi-lib';
import { UrlAttachment } from './datatypes/Common';
import { QuoteImageRepo, QuoteRepo } from "./repository/repo";
import { createLogger } from "./lib/logger";
import path from "path";

const logger = createLogger(path.basename(__filename, path.extname(__filename)));

export async function getReadOne(): Promise<QuoteDto | undefined>{
    let quote = await QuoteRepo().get_ready_one();
    return quote;
}

export async function makeQuoteImage(quote:QuoteDto): Promise<void>{

    if(!quote.contentsEng || !quote.contentsKor) {
        logger.error(`record[${quote.recordId}]: empty contents`);
        await quoteImageProcessError(quote);
        return;
    }

    let arrayContentsEng = quote.contentsEng.split('\n').filter(Boolean);
    if (arrayContentsEng.length != quote.contentCount) {
        logger.error(`record[${quote.recordId}]: invalid contents_eng count. length=${arrayContentsEng.length}, count=${quote.contentCount}`);
        await quoteImageProcessError(quote);
        return;
    }

    let arrayContentsKor = quote.contentsKor.split('\n').filter(Boolean);
    if (arrayContentsKor.length != quote.contentCount) {
        logger.error(`record[${quote.recordId}]: invalid contents_kor. length=${arrayContentsKor.length}, count=${quote.contentCount}`);
        await quoteImageProcessError(quote);
        return;
    }

    // 기존 이미지 프로세싱 데이터 불러오기
    let prevImageList = await QuoteImageRepo().getListByParentRecordId(quote.recordId, quote.contentCount);
    let imageMap = prevImageList.reduce((map, data) => {
        map.set(`${data.parentId}:${data.quotesIndex}`, data);
        return map;
    }, new Map<string, QutoeImageDto>());

    for(let loopIndex=0; loopIndex < quote.contentCount; loopIndex++){
        const quotesIndex = loopIndex + 1;
        let contentsEngSplit = arrayContentsEng[loopIndex].split('|');
        if(contentsEngSplit.length < 2) {
            logger.error(`record[${quote.recordId}][${loopIndex}]: content_eng invalid split.`);
            break;
        }
        let contentsKorSplit = arrayContentsKor[loopIndex].split('|');
        if(contentsKorSplit.length < 2) {
            logger.error(`record[${quote.recordId}][${loopIndex}]: content_kor invalid split.`);
            break;
        }

        let contents = contentsEngSplit[0];
        if(isEmpty(contents)){
            logger.error(`record[${quote.recordId}][${loopIndex}]: empty content_eng.`);
            break;
        }

        // make.com의 모듈이 array가 1부터 시작하기때문에 quotesIndex는 1로 시작.
        const key = `${quote.recordId}:${quotesIndex}`;
        let quoteImage = imageMap.get(key);
        if(quoteImage){
            if(quoteImage.quotesTextEng !== contents){
                const removeResult = await QuoteImageRepo().remove(quoteImage.recordId);
                if(!removeResult){
                    logger.error(`record[${quote.recordId}][${loopIndex}]: QuoteImageRepo remove error. record_id=${quoteImage.recordId}`);
                    break;
                }
                quoteImage = undefined;
            }
        }
        if(!quoteImage){
            const newQuoteImage:QutoeImageDto = {
                recordId: "",
                parentId: quote.recordId,
                quotesIndex: quotesIndex,
                quotesText: contentsKorSplit[0],
                author: contentsKorSplit[1],
                quotesTextEng: contentsEngSplit[0],
                authorEng: contentsEngSplit[1],
                status: "ready",
                //updated: string,
            };
            quoteImage = await QuoteImageRepo().insert(newQuoteImage);
            if(!quoteImage){
                logger.error(`record[${quote.recordId}][${loopIndex}]: QuoteImageRepo insert error.`);
                break;
            }
        }

        imageMap.set(key, quoteImage);
    }

    if(imageMap.size != quote.contentCount){
        logger.error(`record[${quote.recordId}]: invalid map size. length=${imageMap.size}, count=${quote.contentCount}`);
        await quoteImageProcessError(quote);
        return;
    }

    const imageArray = Array.from(imageMap.values()).sort((a, b) => (a.quotesIndex??0) - (b.quotesIndex??0));
    const promises = new Array<Promise<UrlAttachment>>();
    imageArray.map(quoteImage=>{
        promises.push(processOne(quote, quoteImage));
    });

    const finalImages = await Promise.all(promises);
    for(let loopIndex=0; loopIndex<quote.contentCount; loopIndex++){
        if(!finalImages[loopIndex].url){
            logger.error(`record[${quote.recordId}][${loopIndex+1}]: invalid processOne url.`);
            return;
        }
    }

    const updateResult = await QuoteRepo().update(quote.recordId, {
        recordId: quote.recordId,
        images: finalImages,
        imageStatus: "completed"
    });
    if(!updateResult){
        logger.error(`record[${quote.recordId}]: QuoteRepo update error.`);
    }
}

async function processOne(quote:QuoteDto, quoteImage:QutoeImageDto):Promise<UrlAttachment>{
    if(!quoteImage.quotesTextEng){
        return {};
    }

    if(quoteImage.status === "completed" && quoteImage.images?.[0].url && !isEmpty(quoteImage.images[0].url)){
        return {url: quoteImage.images[0].url};
    } else {
        let finalUrl: string | undefined = undefined;
        let targetJobId = quoteImage.midjourneyJobId;
        let whileFlag = true;
        while(whileFlag) {
            if(!targetJobId){
                const prompt = createImagePrompt(quoteImage.quotesTextEng);
                const imagineReq = new JobImagineRequest(prompt);
                const imagineRes = await midjourneyApi().jobImagine(imagineReq);
                if (imagineRes.isOk()) {
                    const updateResult = await QuoteImageRepo().update(quoteImage.recordId, {
                        recordId: "",
                        status: "imagine",
                        midjourneyJobId: imagineRes.jobid
                    });
                    if(updateResult){
                        quoteImage.midjourneyJobId = imagineRes.jobid;
                        targetJobId = imagineRes.jobid;
                    } else {
                        logger.error(`record[${quote.recordId}][${quoteImage.quotesIndex}]:Imagine QuoteImageRepo update fail. record_id=${quoteImage.recordId}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * 20));
                } else if( imagineRes.code == 429 ) {
                    // Too Many Requests
                    await new Promise(resolve => setTimeout(resolve, 1000 * 30));
                } else {
                    logger.error(`record[${quote.recordId}][${quoteImage.quotesIndex}]: MidjourneyApi.jobImagine fail. code=${imagineRes.code}, error=${imagineRes.error}`);
                    await quoteImageProcessError(quote);
                    return {};
                }   
            } else {
                const jobRes = await midjourneyApi().getJob(targetJobId);
                if(jobRes.isOk()){
                    switch(jobRes.status) {
                        case "completed":
                            logger.debug(`record[${quote.recordId}][${quoteImage.quotesIndex}]: Midjourne job ${jobRes.status}. jobId=${jobRes.jobid}`);

                            switch(jobRes.verb){
                                case "imagine":
                                    const buttonReq = new JobButtonRequest(targetJobId, "U1");
                                    const buttonRes = await midjourneyApi().jobButton(buttonReq);
                                    if( buttonRes.isOk() ){
                                        const updateResult = await QuoteImageRepo().update(quoteImage.recordId, {
                                            recordId: "",
                                            status: "upscale",
                                            midjourneyJobId: buttonRes.jobid
                                        });
                                        if(updateResult){
                                            quoteImage.midjourneyJobId = buttonRes.jobid;
                                            targetJobId = buttonRes.jobid;
                                            logger.debug(`record[${quote.recordId}][${quoteImage.quotesIndex}]: Midjourne ${jobRes.verb} ok.`);
                                        } else {
                                            logger.error(`record[${quote.recordId}][${quoteImage.quotesIndex}]:Imagine QuoteImageRepo update fail. record_id=${quoteImage.recordId}`);
                                        }
                                        await new Promise(resolve => setTimeout(resolve, 1000 * 10));
                                    } else if( buttonRes.code == 429 ) {
                                        // Too Many Requests
                                        await new Promise(resolve => setTimeout(resolve, 1000 * 30));
                                    } else {
                                        logger.error(`record[${quote.recordId}][${quoteImage.quotesIndex}]: MidjourneyApi.jobButton fail. jobId=${jobRes.jobid}, code=${buttonRes.code}, error=${buttonRes.error}`);
                                        await quoteImageProcessError(quote);
                                        return {};
                                    }
                                    break;
                                case "button":
                                    if(jobRes.attachments && jobRes.attachments.length > 0 && jobRes.attachments) {
                                        const imageUrl = jobRes.attachments[0].url;
                                        const imageWidth = jobRes.attachments[0].width;
                                        const imageHeight = jobRes.attachments[0].height;
                                        const imageSize = jobRes.attachments[0].size;

                                        logger.debug(`record[${quote.recordId}][${quoteImage.quotesIndex}]: Midjourne ${jobRes.verb} ok. url=${jobRes.attachments[0].url}`);

                                        const quoteUpdated = await QuoteImageRepo().update(quoteImage.recordId, {
                                            recordId: quoteImage.recordId,
                                            quotesIndex: quoteImage.quotesIndex,
                                            status: "completed",
                                            midjourneyJobId: jobRes.jobid,
                                            images: [{
                                                url: imageUrl
                                            }],
                                            imageWidth: imageWidth,
                                            imageHeight: imageHeight,
                                            imageSize: imageSize
                                        });
                                        if(quoteUpdated){
                                            whileFlag = false;
                                            finalUrl = quoteUpdated.images?.[0].url;
                                            logger.debug(`record[${quote.recordId}][${quoteImage.quotesIndex}]: QuoteImageRepo update ok`);
                                        } else {
                                            logger.error(`record[${quote.recordId}][${quoteImage.quotesIndex}]: QuoteImageRepo update error.`);
                                            await quoteImageProcessError(quote);
                                            return {};
                                        }
                                    } else {
                                        logger.error(`record[${quote.recordId}][${quoteImage.quotesIndex}]: Midjourney attachments error. jobId=${targetJobId}`);
                                        await quoteImageProcessError(quote);
                                        return {};
                                    }
                                    break;
                                default:
                                    break;
                            }
                            break; 
                        case "created":
                        case "started":
                        case "moderated":
                        case "progress":
                            await new Promise(resolve => setTimeout(resolve, 1000 * 20));
                            break;
                        default:
                            const updateResult = await QuoteImageRepo().update(quoteImage.recordId, {
                                recordId: "",
                                status: `error:${jobRes.status}`,
                                midjourneyJobId: jobRes.jobid
                            });
                            logger.error(`record[${quote.recordId}][${quoteImage.quotesIndex}]: MidjourneyApi.getJob fail. jobId=${targetJobId}, status=${jobRes.status}`);
                            await quoteImageProcessError(quote);
                            return {};
                    }
                } else {
                    logger.error(`record[${quote.recordId}][${quoteImage.quotesIndex}]: MidjourneyApi.getJob fail. jobId=${targetJobId}, code=${jobRes.code}, error=${jobRes.error}`);
                    await quoteImageProcessError(quote);
                    return {};
                }
            }
            await new Promise(resolve => setTimeout(resolve, 1));
        } // while

        if(!finalUrl){
            await quoteImageProcessError(quote);
            return {}
        }

        return {url: finalUrl};
    }
}

function createImagePrompt(content:string){
    const finalContent = content.replace(/"/g, ' ');
    return `create an image that goes well with the following sentence. "${finalContent}" —ar 3:4 —q .25`;
}

async function quoteImageProcessError(quote:QuoteDto): Promise<void> {
    let update:QuoteDto = {
        recordId: quote.recordId,
        imageStatus: "worker_error"
    }

    const updateResult = await QuoteRepo().update(quote.recordId, update);
    if(!updateResult){
        logger.error(`record[${quote.recordId}]: QuoteRepo update error.`);
    }
}
