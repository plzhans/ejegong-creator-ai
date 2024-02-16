import { QuoteRepoInst } from './repository/QuoteRepo';
import { QuoteDto } from "./datatypes/QuoteDto";
import { QuoteImageRepoInst } from './repository/QuoteImageRepo';
import { QutoeImageDto } from './datatypes/QuoteImageDto';
import { isEmpty } from 'lodash';
import { MidjourneyApi } from './lib/lib';
import { JobButtonRequest, JobImagineRequest } from 'useapi-lib';
import { UrlAttachment } from './datatypes/Common';

async function main(): Promise<void> {
    await make_quote_image();
}

async function make_quote_image(): Promise<void>{

    let quote = await QuoteRepoInst.get_ready_one();
    if(!quote) {
        console.debug(`record[]: continue.`);
        return;
    }
    if(!quote.contentsEng || !quote.contentsKor) {
        console.error(`record[${quote.recordId}]: empty contents`);
        await set_quote_image_process_error(quote);
        return;
    }

    let arrayContentsEng = quote.contentsEng.split('\n').filter(Boolean);
    if (arrayContentsEng.length != quote.contentCount) {
        console.error(`record[${quote.recordId}]: invalid contents_eng count. length=${arrayContentsEng.length}, count=${quote.contentCount}`);
        await set_quote_image_process_error(quote);
        return;
    }

    let arrayContentsKor = quote.contentsKor.split('\n').filter(Boolean);
    if (arrayContentsKor.length != quote.contentCount) {
        console.error(`record[${quote.recordId}]: invalid contents_kor. length=${arrayContentsKor.length}, count=${quote.contentCount}`);
        await set_quote_image_process_error(quote);
        return;
    }

    // 기존 이미지 프로세싱 데이터 불러오기
    let prevImageList = await QuoteImageRepoInst.getListByParentRecordId(quote.recordId, quote.contentCount);
    let imageMap = prevImageList.reduce((map, data) => {
        map.set(`${data.parentId}:${data.quotesIndex}`, data);
        return map;
    }, new Map<string, QutoeImageDto>()); 
    
    let finalImages = new Array<UrlAttachment>();
    for(let loopIndex=0; loopIndex<quote.contentCount; loopIndex++){
        const quotesIndex = loopIndex + 1;
        let contentsEngSplit = arrayContentsEng[loopIndex].split('|');
        if(contentsEngSplit.length < 2) {
            console.error(`record[${quote.recordId}][${loopIndex}]: content_eng invalid split.`);
            break;
        }
        let contentsKorSplit = arrayContentsKor[loopIndex].split('|');
        if(contentsKorSplit.length < 2) {
            console.error(`record[${quote.recordId}][${loopIndex}]: content_kor invalid split.`);
            break;
        }

        let contents = contentsEngSplit[0];
        if(isEmpty(contents)){
            console.error(`record[${quote.recordId}][${loopIndex}]: empty content_eng.`);
            break;
        }

        // make.com의 모듈이 array가 1부터 시작하기때문에 quotesIndex는 1로 시작.
        const key = `${quote.recordId}:${quotesIndex}`;
        let prev = imageMap.get(key);
        if(prev){
            if(prev.quotesTextEng !== contents){
                const removeResult = await QuoteImageRepoInst.remove(prev.recordId);
                if(!removeResult){
                    console.error(`record[${quote.recordId}][${loopIndex}]: QuoteImageRepo remove error. record_id=${prev.recordId}`);
                    break;
                }
                prev = undefined;
            }
        }
        if(!prev){
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
            prev = await QuoteImageRepoInst.insert(newQuoteImage);
            if(!prev){
                console.error(`record[${quote.recordId}][${loopIndex}]: QuoteImageRepo insert error.`);
                break;
            }
        }

        if(prev.status === "completed" && prev.images?.[0].url && !isEmpty(prev.images[0].url)){
            finalImages.push({url: prev.images[0].url});
        } else {
            let finalUrl: string | undefined = undefined;
            let targetJobId = prev.midjourneyJobId;
            let whileFlag = true;
            while(whileFlag) {
                if(!targetJobId){
                    const prompt = create_image_prompt(contents);
                    const imagineReq = new JobImagineRequest(prompt);
                    const imagineRes = await MidjourneyApi.jobImagine(imagineReq);
                    if (imagineRes.isOk()) {
                        const updateResult = await QuoteImageRepoInst.update(prev.recordId, {
                            recordId: "",
                            status: "imagine",
                            midjourneyJobId: imagineRes.jobid
                        });
                        if(updateResult){
                            prev.midjourneyJobId = imagineRes.jobid;
                            targetJobId = imagineRes.jobid;
                        } else {
                            console.error(`record[${quote.recordId}][${loopIndex}]:Imagine QuoteImageRepo update fail. record_id=${prev.recordId}`);
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000 * 20));
                    } else if( imagineRes.code == 429 ) {
                        // Too Many Requests
                        await new Promise(resolve => setTimeout(resolve, 1000 * 30));
                    } else {
                        console.error(`record[${quote.recordId}][${loopIndex}]: MidjourneyApi.jobImagine fail. code=${imagineRes.code}, error=${imagineRes.error}`);
                        await set_quote_image_process_error(quote);
                        return;
                    }   
                } else {
                    const jobRes = await MidjourneyApi.getJob(targetJobId);
                    if(jobRes.isOk()){
                        switch(jobRes.status) {
                            case "completed":
                                console.debug(`record[${quote.recordId}][${loopIndex}]: Midjourne job ${jobRes.status}. jobId=${jobRes.jobid}`);

                                switch(jobRes.verb){
                                    case "imagine":
                                        const buttonReq = new JobButtonRequest(targetJobId, "U1");
                                        const buttonRes = await MidjourneyApi.jobButton(buttonReq);
                                        if( buttonRes.isOk() ){
                                            const updateResult = await QuoteImageRepoInst.update(prev.recordId, {
                                                recordId: "",
                                                status: "upscale",
                                                midjourneyJobId: buttonRes.jobid
                                            });
                                            if(updateResult){
                                                prev.midjourneyJobId = buttonRes.jobid;
                                                targetJobId = buttonRes.jobid;
                                                console.debug(`record[${quote.recordId}][${loopIndex}]: Midjourne ${jobRes.verb} ok.`);
                                            } else {
                                                console.error(`record[${quote.recordId}][${loopIndex}]:Imagine QuoteImageRepo update fail. record_id=${prev.recordId}`);
                                            }
                                            await new Promise(resolve => setTimeout(resolve, 1000 * 10));
                                        } else if( buttonRes.code == 429 ) {
                                            // Too Many Requests
                                            await new Promise(resolve => setTimeout(resolve, 1000 * 30));
                                        } else {
                                            console.error(`record[${quote.recordId}][${loopIndex}]: MidjourneyApi.jobButton fail. jobId=${jobRes.jobid}, code=${buttonRes.code}, error=${buttonRes.error}`);
                                            await set_quote_image_process_error(quote);
                                            return;
                                        }
                                        break;
                                    case "button":
                                        if(jobRes.attachments && jobRes.attachments.length > 0 && jobRes.attachments) {
                                            const imageUrl = jobRes.attachments[0].url;
                                            const imageWidth = jobRes.attachments[0].width;
                                            const imageHeight = jobRes.attachments[0].height;
                                            const imageSize = jobRes.attachments[0].size;

                                            console.debug(`record[${quote.recordId}][${loopIndex}]: Midjourne ${jobRes.verb} ok. url=${jobRes.attachments[0].url}`);

                                            const quoteUpdated = await QuoteImageRepoInst.update(prev.recordId, {
                                                recordId: prev.recordId,
                                                quotesIndex: quotesIndex,
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
                                                console.debug(`record[${quote.recordId}][${loopIndex}]: QuoteImageRepo update ok`);
                                            } else {
                                                console.error(`record[${quote.recordId}][${loopIndex}]: QuoteImageRepo update error.`);
                                                await set_quote_image_process_error(quote);
                                                return;
                                            }
                                        } else {
                                            console.error(`record[${quote.recordId}][${loopIndex}]: Midjourney attachments error. jobId=${targetJobId}`);
                                            await set_quote_image_process_error(quote);
                                            return;
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
                                const updateResult = await QuoteImageRepoInst.update(prev.recordId, {
                                    recordId: "",
                                    status: `error:${jobRes.status}`,
                                    midjourneyJobId: jobRes.jobid
                                });
                                console.error(`record[${quote.recordId}][${loopIndex}]: MidjourneyApi.getJob fail. jobId=${targetJobId}, status=${jobRes.status}`);
                                await set_quote_image_process_error(quote);
                                return;
                        }
                    } else {
                        console.error(`record[${quote.recordId}][${loopIndex}]: MidjourneyApi.getJob fail. jobId=${targetJobId}, code=${jobRes.code}, error=${jobRes.error}`);
                        await set_quote_image_process_error(quote);
                        return;
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 1));
            } // while

            if(finalUrl){
                finalImages.push({url: finalUrl});
            }
        }
    }

    if(finalImages.length != quote.contentCount){
        console.error(`record[${quote.recordId}]: invalid image count. length=${finalImages.length}, count=${quote.contentCount}`);
        await set_quote_image_process_error(quote);
        return;
    }

    const updateResult = await QuoteRepoInst.update(quote.recordId, {
        recordId: quote.recordId,
        images: finalImages,
        imageStatus: "completed"
    });
    if(!updateResult){
        console.error(`record[${quote.recordId}]: QuoteRepo update error.`);
    }
}

function create_image_prompt(content:string){
    const finalContent = content.replace(/"/g, ' ');
    return `create an image that goes well with the following sentence. "${finalContent}" —ar 3:4 —q .25`;
}

async function set_quote_image_process_error(data:QuoteDto): Promise<QuoteDto | null> {
    let update:QuoteDto = {
        recordId: data.recordId,
        imageStatus: "worker_error"
    }
    return update;
}

main().catch(err=>{
    console.error(err);
});
