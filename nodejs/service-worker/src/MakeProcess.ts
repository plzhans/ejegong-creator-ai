import { QuoteDto } from "./datatypes/QuoteDto";
import { QutoeImageDto } from './datatypes/QuoteImageDto';
import { isEmpty } from 'lodash';
import { midjourneyApi } from './lib/midjourney';
import { JobButtonRequest, JobImagineRequest } from 'useapi-lib';
import { UrlAttachment } from './datatypes/Common';
import { ConfigRepo, QuoteImageRepo, QuoteRepo } from "./repository/repo";
import { createLogger } from "./lib/logger";
import path from "path";
import telegramLib from "./lib/telegramLib";
import dateLib from "./lib/dateLib";
import { EditMessageTextOptions, SendMessageOptions } from "node-telegram-bot-api";
import { getAppConfig } from "./config";

const moduleLogger = createLogger(path.basename(__filename, path.extname(__filename)));

export async function isProcessEnabled():Promise<boolean>{
    let enabeld = await ConfigRepo().getBoolean("system.service_worker.enable");
    return enabeld || false;
}

export async function getReadOne(): Promise<QuoteDto | undefined>{
    
    let quote = await QuoteRepo().get_ready_one();
    return quote;
}

export async function makeQuoteImage(quote:QuoteDto): Promise<void>{
    const logger = moduleLogger.child(`makeQuoteImage('${quote.recordId}')`);

    const config = getAppConfig();
    if(!quote.contentsEng || !quote.contentsKor) {
        logger.error(`Empty contents`);
        await processError(quote);
        return;
    }

    let arrayContentsEng = quote.contentsEng.split('\n').filter(Boolean);
    if (arrayContentsEng.length != quote.contentCount) {
        logger.error(`Invalid contents_eng count. length=${arrayContentsEng.length}, count=${quote.contentCount}`);
        await processError(quote);
        return;
    }

    let arrayContentsKor = quote.contentsKor.split('\n').filter(Boolean);
    if (arrayContentsKor.length != quote.contentCount) {
        logger.error(`Invalid contents_kor. length=${arrayContentsKor.length}, count=${quote.contentCount}`);
        await processError(quote);
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
            logger.error(`QuoteImage[${loopIndex}]: content_eng invalid split.`);
            break;
        }
        let contentsKorSplit = arrayContentsKor[loopIndex].split('|');
        if(contentsKorSplit.length < 2) {
            logger.error(`QuoteImage[${loopIndex}]: content_kor invalid split.`);
            break;
        }

        let contents = contentsEngSplit[0];
        if(isEmpty(contents)){
            logger.error(`QuoteImage[${loopIndex}]: empty content_eng.`);
            break;
        }

        // make.com의 모듈이 array가 1부터 시작하기때문에 quotesIndex는 1로 시작.
        const key = `${quote.recordId}:${quotesIndex}`;
        let quoteImage = imageMap.get(key);
        if(quoteImage){
            if(quoteImage.quotesTextEng !== contents){
                const removeResult = await QuoteImageRepo().remove(quoteImage.recordId);
                if(!removeResult){
                    logger.error(`QuoteImage[${loopIndex}]: QuoteImageRepo remove error. record_id=${quoteImage.recordId}`);
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
                logger.error(`QuoteImage[${loopIndex}]: QuoteImageRepo insert error.`);
                break;
            }
        }
        imageMap.set(key, quoteImage);
    }

    if(imageMap.size != quote.contentCount){
        logger.error(`Invalid map size. length=${imageMap.size}, count=${quote.contentCount}`);
        await processError(quote);
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
            logger.error(`QuoteImage[${loopIndex+1}]: invalid processOne url.`);
            return;
        }
    }

    const updateResult = await QuoteRepo().update(quote.recordId, {
        recordId: quote.recordId,
        images: finalImages,
        imageStatus: "completed"
    });
    if(!updateResult){
        logger.error(`QuoteRepo update error.`);
    }

    const message = [
        "[Worker] 명언 생성 자동화",
        ">> 상태 : 영상 생성 요청 (Creatomate)",
        `>> 주제 : ${quote.subject}, 2.${quote.contentCount}개`,
        `>> record_id : ${quote.recordId}`,
        `>> date : ${dateLib.nowStr()}`,
        "",
        quote.contentsKor,
        // "",
        // ...finalImages.map((item,index) => `${index+1}: ${item.url || ""}`)
    ].join("\n");

    if (quote.telegram_message_id){
        const messageOptions:EditMessageTextOptions = {
            reply_markup: {
                inline_keyboard: [[{
                    text: "Retry",
                    url: `${config.ejecreator.api.url}?step=image-confirm-yes&record_id=${quote.recordId}`
                }]]
            }
        };
        await telegramLib.editMessageText(quote.telegram_message_id, message, messageOptions);
    } else {
        const messageOptions:SendMessageOptions = {
            reply_markup: {
                inline_keyboard: [[{
                    text: "Retry",
                    url: `${config.ejecreator.api.url}?step=image-confirm-yes`
                }]]
            }
        };
        telegramLib.sendMessage(message, messageOptions).then(sendResult=>{
            QuoteRepo().update(quote.recordId, {
                recordId: quote.recordId,
                telegram_message_id: sendResult?.message_id
            }).then(result=>{
                logger.info(`Final new message ok. message_id=${sendResult?.message_id}`);
            }).catch(err=>{
                logger.error(`Final quote repo update fail. ${err}`);
            });
        }).catch(err=>{
            logger.error(`Final new message send fail. ${err}`);
        });
    }
}

async function processOne(quote:QuoteDto, quoteImage:QutoeImageDto):Promise<UrlAttachment>{
    const logger = moduleLogger.child(`processOne('${quote.recordId}')`);
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
                        logger.error(`QuoteImage[${quoteImage.quotesIndex}]:Imagine QuoteImageRepo update fail. record_id=${quoteImage.recordId}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * 20));
                } else if( imagineRes.code == 429 ) {
                    // Too Many Requests
                    await new Promise(resolve => setTimeout(resolve, 1000 * 30));
                } else {
                    logger.error(`QuoteImage[${quoteImage.quotesIndex}]: MidjourneyApi.jobImagine fail. code=${imagineRes.code}, error=${imagineRes.error}`);
                    await processError(quote);
                    return {};
                }   
            } else {
                const jobRes = await midjourneyApi().getJob(targetJobId);
                if(jobRes.isOk()){
                    switch(jobRes.status) {
                        case "completed":
                            logger.debug(`QuoteImage[${quoteImage.quotesIndex}]: Midjourne job ${jobRes.status}. jobId=${jobRes.jobid}`);

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
                                            logger.debug(`QuoteImage[${quoteImage.quotesIndex}]: Midjourne ${jobRes.verb} ok.`);
                                        } else {
                                            logger.error(`QuoteImage[${quoteImage.quotesIndex}]:Imagine QuoteImageRepo update fail. record_id=${quoteImage.recordId}`);
                                        }
                                        await new Promise(resolve => setTimeout(resolve, 1000 * 10));
                                    } else if( buttonRes.code == 429 ) {
                                        // Too Many Requests
                                        await new Promise(resolve => setTimeout(resolve, 1000 * 30));
                                    } else {
                                        logger.error(`QuoteImage[${quoteImage.quotesIndex}]: MidjourneyApi.jobButton fail. jobId=${jobRes.jobid}, code=${buttonRes.code}, error=${buttonRes.error}`);
                                        await processError(quote);
                                        return {};
                                    }
                                    break;
                                case "button":
                                    if(jobRes.attachments && jobRes.attachments.length > 0 && jobRes.attachments) {
                                        const imageUrl = jobRes.attachments[0].url;
                                        const imageWidth = jobRes.attachments[0].width;
                                        const imageHeight = jobRes.attachments[0].height;
                                        const imageSize = jobRes.attachments[0].size;

                                        logger.debug(`QuoteImage[${quoteImage.quotesIndex}]: Midjourne ${jobRes.verb} ok. url=${jobRes.attachments[0].url}`);

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
                                            logger.debug(`QuoteImage[${quoteImage.quotesIndex}]: QuoteImageRepo update ok`);
                                        } else {
                                            logger.error(`QuoteImage[${quoteImage.quotesIndex}]: QuoteImageRepo update error.`);
                                            await processError(quote);
                                            return {};
                                        }
                                    } else {
                                        logger.error(`QuoteImage[${quoteImage.quotesIndex}]: Midjourney attachments error. jobId=${targetJobId}`);
                                        await processError(quote);
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
                            logger.error(`QuoteImage[${quoteImage.quotesIndex}]: MidjourneyApi.getJob fail. jobId=${targetJobId}, status=${jobRes.status}`);
                            await processError(quote);
                            return {};
                    }
                } else {
                    logger.error(`QuoteImage[${quoteImage.quotesIndex}]: MidjourneyApi.getJob fail. jobId=${targetJobId}, code=${jobRes.code}, error=${jobRes.error}`);
                    await processError(quote);
                    return {};
                }
            }
            await new Promise(resolve => setTimeout(resolve, 1));
        } // while

        if(!finalUrl){
            await processError(quote);
            return {}
        }

        return {url: finalUrl};
    }
}

function createImagePrompt(content:string){
    const finalContent = content.replace(/"/g, ' ');
    return `create an image that goes well with the following sentence. "${finalContent}" —ar 3:4 —q .25`;
}

async function processError(quote:QuoteDto): Promise<void> {
    const logger = moduleLogger.child(`processError('${quote.recordId}')`);
    let update:QuoteDto = {
        recordId: quote.recordId,
        imageStatus: "worker_error"
    }

    const updateResult = await QuoteRepo().update(quote.recordId, update);
    if(!updateResult){
        logger.error(`QuoteRepo update error.`);
    }
}
