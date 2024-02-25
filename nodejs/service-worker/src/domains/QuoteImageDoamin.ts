import { Logger } from "winston";
import { QutoeImageDto } from "../datatypes/QuoteImageDto";
import { QuoteImageRepo } from "../repository/repo";
import { createLogger } from "../lib/logger";
import { isEmpty } from "lodash";
import { GetJobResponse, JobButtonRequest, JobButtonResponse, JobImagineRequest, JobImagineResponse } from "useapi-lib";
import { midjourneyApi } from "../lib/midjourney";

export class QuoteImageDomain {
    
    private logger:Logger;
    private entity:QutoeImageDto;

    public static async new(entity:QutoeImageDto): Promise<QuoteImageDomain|undefined> {
        const inserted = await QuoteImageRepo().insert(entity);
        if(!inserted){
            const logger = createLogger("QutoeImage", {parent_id: entity.parentId, record_id: entity.recordId, quote_index: entity.quotesIndex});;
            logger.error(`QuoteImage[${entity.quotesIndex}]: QuoteImageRepo insert error.`);
            return undefined;
        }
        return new QuoteImageDomain(inserted);
    }

    public constructor(entity:QutoeImageDto){
        this.logger = createLogger("QutoeImage", {parent_id: entity.parentId, record_id: entity.recordId, quote_index: entity.quotesIndex});
        this.entity = entity;
    }

    public isQuoteTextEng():boolean {
        return !isEmpty(this.entity.quotesTextEng);
    }

    public equalsQuoteTextEng(contents: string):boolean {
        return this.entity.quotesTextEng === contents
    }

    public isCompleted():boolean {
        return this.entity.status === "completed";
    }

    public isImageUrl(): boolean {
        if(this.entity.images?.[0].url){
            return !isEmpty(this.entity.images[0].url);
        }
        return false;
    }

    public getImageUrl(): string | undefined {
        return this.entity.images?.[0].url ;
    }

    public getMidjourneyJobId(): string | undefined {
        return this.entity.midjourneyJobId;
    }

    public getQuotesIndex(): number {
        return this.entity.quotesIndex ?? 0;
    }
    
    public getMapKey():string {
        return `${this.entity.parentId}:${this.entity.quotesIndex}`;
    }

    public async remove(): Promise<boolean> {
        const result = await QuoteImageRepo().remove(this.entity.recordId);
        if(!result){
            this.logger.error(`QuoteImageRepo remove error.`);
            return false;
        }
        return true;
    }

    public async processError(status:string, message:string): Promise<void> {
        await QuoteImageRepo().update(this.entity.recordId, {
            recordId: "",
            status: `error:${status}`,
        });
    }

    private createImagePrompt(){
        const finalContent = this.entity.quotesTextEng?.replace(/"/g, ' ');
        return `create an image that goes well with the following sentence. "${finalContent}" —ar 3:4 —q .25`;
    }

    public async getMidjourneyJob(): Promise<GetJobResponse>{
        const jobRes = await midjourneyApi().getJob(this.entity.midjourneyJobId??"");
        if(!jobRes.isOk()){
            this.logger.error(`midjourneyApi().getJob(): fail. jobId=${this.entity.midjourneyJobId}, code=${jobRes.code}, error=${jobRes.error}`);
        }
        return jobRes;
    }

    public async sendMidjourneyImagine(): Promise<number> {
        const prompt = this.createImagePrompt();
        const imagineReq = new JobImagineRequest(prompt);
        const imagineRes = await midjourneyApi().jobImagine(imagineReq);
        if(!imagineRes.isOk()){
            if( imagineRes.code == 429 ) {
                return 2;
            } else {
                this.logger.error(`MidjourneyApi.jobImagine fail. code=${imagineRes.code}, error=${imagineRes.error}`);
                return 3;
            }
        }  

        const updateResult = await QuoteImageRepo().update(this.entity.recordId, {
            recordId: "",
            status: "imagine",
            midjourneyJobId: imagineRes.jobid
        });
        if(!updateResult){
            this.logger.error(`Imagine QuoteImageRepo update fail.`);
            return 4;
        } 

        this.entity.midjourneyJobId = imagineRes.jobid;
        return 1;
    }

    public async sendMidjourneyScaleUp(): Promise<number> {
        const buttonReq = new JobButtonRequest(this.entity.midjourneyJobId??"", "U1");
        const buttonRes = await midjourneyApi().jobButton(buttonReq);
        if( !buttonRes.isOk() ){
            if (buttonRes.code == 429) {
                return 2;
            } else {
                this.logger.error(`MidjourneyApi.jobButton fail. jobId=${this.entity.midjourneyJobId}, code=${buttonRes.code}, error=${buttonRes.error}`);
              
            }
        }
    
        this.logger.debug(`Midjourne ${buttonRes.verb} ok.`);
        const updateResult = await QuoteImageRepo().update(this.entity.recordId, {
            recordId: "",
            status: "upscale",
            midjourneyJobId: buttonRes.jobid
        });
        if(!updateResult){
            this.logger.error(`QuoteImageRepo update fail.`);
            return 4;
        } 

        this.entity.midjourneyJobId = buttonRes.jobid;
        return 1;
    }

    public async processCompleted(job:GetJobResponse): Promise<number> {
        if(!job.attachments || job.attachments.length == 0) {
            this.logger.error(`Midjourney attachments error. jobId=${job.jobid}`);
            return 2;
        }

        const imageUrl = job.attachments[0].url;
        const imageWidth = job.attachments[0].width;
        const imageHeight = job.attachments[0].height;
        const imageSize = job.attachments[0].size;

        const quoteUpdated = await QuoteImageRepo().update(this.entity.recordId, {
            recordId: this.entity.recordId,
            quotesIndex: this.entity.quotesIndex,
            status: "completed",
            midjourneyJobId: job.jobid,
            images: [{
                url: imageUrl
            }],
            imageWidth: imageWidth,
            imageHeight: imageHeight,
            imageSize: imageSize
        });
        if(!quoteUpdated){
            this.logger.error(`QuoteImageRepo update error.`);
            return 3;
        }

        this.entity = quoteUpdated;

        this.logger.debug(`processCompleted(). url=${imageUrl}`);
        return 1;
    }
    
}