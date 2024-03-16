import { QuoteDto, QutoeStatus } from "../datatypes/QuoteDto"
import { createLogger } from "../lib/logger";
import { Logger } from "winston";
import { getAppConfig } from "../config";
import { QuoteImageRepo, QuoteRepo } from "../repository/repo";
import { isEmpty } from "lodash";
import { UrlAttachment } from "../datatypes/Common";
import dateLib from "../lib/dateLib";
import { EditMessageTextOptions, InlineKeyboardMarkup, SendMessageOptions } from "node-telegram-bot-api";
import telegramLib from "../lib/telegramLib";
import { QuoteImageDomain } from "./QuoteImageDoamin";
import { Render as CreatomateRender } from "creatomate";

export class QuoteDomain {
    
    private logger:Logger;
    private entity:QuoteDto;

    constructor(entity:QuoteDto){
        this.logger = createLogger("QuoteDomain", {record_id: entity.recordId});
        this.entity = entity;
    }

    public getLogger(): Logger {
        return this.logger;
    }

    public getEntity(): QuoteDto{
        return this.entity;
    }

    public getId():string {
        return this.entity.recordId;
    }

    public getStatus(): QutoeStatus {
        return this.entity.status ?? QutoeStatus.unknown;
    }

    public getContentCount(): number {
        return this.entity.contentCount ?? 0;
    }

    public isContents():boolean{
        return !isEmpty(this.entity.contentsEng) && !isEmpty(this.entity.contentsKor);
    }

    public getVideoMakeData():QuoteVideoMakeData {
        const entity = this.entity;
        if(!entity.contentCount || entity.contentCount < 1 ){
            throw new Error("Invalid contentCount");
        }
        const contentsKor = this.getContentsKor();
        if(contentsKor.length != this.getContentCount()){
            throw new Error(`Invalid contentsKor. lengh={contentsKor.length}, count=this.getContentCount())`);
        }
        const contentsEng = this.getContentsEng();
        if(contentsEng.length != this.getContentCount()){
            throw new Error(`Invalid contentsEng. lengh={contentsEng.length}, count=this.getContentCount())`);
        }
        if(!entity.images || entity.contentCount != entity.images.length){
            throw new Error("Invalid images");
        }
        entity.images
        const data = new QuoteVideoMakeData(entity.contentCount, contentsKor, contentsEng, entity.images);
        return data;
    }

    public async processError(message:string): Promise<void> {
        this.logger.error(`processError. ${message}`);
        
        const domain = this.entity;
        let update:QuoteDto = {
            recordId: domain.recordId,
            imageStatus: "process_error"
        }

        const updateResult = await QuoteRepo().update(domain.recordId, update);
        if(!updateResult){
            this.logger.error(`QuoteRepo update error.`);
        }
    }

    public async processImageCompleted(finalImages:UrlAttachment[]){
        for(let loopIndex=0; loopIndex<this.getContentCount(); loopIndex++){
            if(!finalImages[loopIndex].url){
                this.logger.error(`QuoteImage[${loopIndex+1}]: invalid processOne url.`);
                return;
            }
        }

        const updateResult = await QuoteRepo().update(this.entity.recordId, {
            recordId: this.entity.recordId,
            images: finalImages,
            status: QutoeStatus.Image_Completed,
            imageStatus: "completed"
        });
        if(!updateResult){
            this.logger.error(`QuoteRepo update error.`);
            return;
        }
        this.entity = updateResult;
    }

    public async sendCompletedMessage(){
        const config = getAppConfig();
        const message = [
            "[Worker] 명언 생성 자동화",
            ">> 상태 : 영상 생성 대기",
            `>> 주제 : ${this.entity.subject}, 2.${this.entity.contentCount}개`,
            `>> record_id : ${this.entity.recordId}`,
            `>> date : ${dateLib.nowStr()}`,
            "",
            this.getPrettyContentsKor(),
            // "",
            // ...finalImages.map((item,index) => `${index+1}: ${item.url || ""}`)
        ].join("\n");

        const replyMarkup:InlineKeyboardMarkup = {
            inline_keyboard: [[{
                text: "Retry",
                url: `${config.ejecreator.api.url}?step=image-confirm-yes&record_id=${this.entity.recordId}`
            }]]
        };

        if (this.entity.telegram_message_id){
            const messageOptions:EditMessageTextOptions = {
                reply_markup: replyMarkup
            };
            await telegramLib.editMessageText(this.entity.telegram_message_id, message, messageOptions);
        } else {
            const messageOptions:SendMessageOptions = {
                reply_markup: replyMarkup
            };
            telegramLib.sendMessage(message, messageOptions).then(sendResult=>{
                QuoteRepo().update(this.entity.recordId, {
                    recordId: this.entity.recordId,
                    telegram_message_id: sendResult?.message_id
                }).then(result=>{
                    this.logger.info(`Final new message ok. message_id=${sendResult?.message_id}`);
                }).catch(err=>{
                    this.logger.error(`Final quote repo update fail. ${err}`);
                });
            }).catch(err=>{
                this.logger.error(`Final new message send fail. ${err}`);
            });
        }
    }

    public getPrettyContentsKor(): string | undefined {
        return this.entity.contentsKor?.replace(/\|/g, ' | ')
            .replace(/\n/g, '\n\n');
    }

    public getContentsKor():string[]{
        return this.entity.contentsKor?.split('\n').filter(Boolean)?? [];
    }

    public getContentsEng():string[]{
        return this.entity.contentsEng?.split('\n').filter(Boolean)?? [];
    }

    public async getImageList():Promise<QuoteImageDomain[]>{
        let list = await QuoteImageRepo().getListByParentRecordId(this.entity.recordId, this.getContentCount());
        return list.map(data=>{
            return new QuoteImageDomain(data);
        });
    }

    public async getImageMap():Promise<Map<string,QuoteImageDomain>>{
        let list = await this.getImageList();
        let imageMap = list.reduce((map, data) => {
            map.set(data.getMapKey(), data);
            return map;
        }, new Map<string, QuoteImageDomain>());
        return imageMap;
    }

    public async processVideoReady(){
        const updateResult = await QuoteRepo().update(this.entity.recordId, {
            recordId: this.entity.recordId,
            status: QutoeStatus.Video_Completed,
        });
        if(!updateResult){
            this.logger.error(`QuoteRepo update error.`);
            return;
        }
        this.entity.status = updateResult.status;
    }

    public async processVideoMaking(render:CreatomateRender): Promise<boolean>{
        const updateResult = await QuoteRepo().update(this.entity.recordId, {
            recordId: this.entity.recordId,
            status: QutoeStatus.Video_Making,
            videoStatus: render.status,
            creatomateRederId: render.id,
            mediaUrl: render.url,
            snapshotUrl: render.snapshotUrl,
        });
        if(!updateResult){
            this.logger.error(`QuoteRepo update error.`);
            return false;
        }
        this.entity = updateResult;
        return true;
    }

    public async processVideoCompleted(){
        const entity = this.entity;
        if(!entity.creatomateRederId){
            return;
        }

        
    }
}

export class QuoteVideoMakeData {
    public Count:number;
    public korContents:QuoteContents[];
    public engContents:QuoteContents[];
    public backgroundImage: string[];

    public getKorContents():QuoteContents[]{
        return this.korContents;
    }

    public getEngContents():QuoteContents[]{
        return this.engContents;
    }

    constructor(count:number, contents:string[], contentEng:string[], images:UrlAttachment[]){
        this.Count = count;
        this.korContents = new Array<QuoteContents>(count);
        this.engContents = new Array<QuoteContents>(count);
        this.backgroundImage = new Array<string>(count);
        contents.forEach(data=>{
            const contents = new QuoteContents(data);
            this.korContents.push(contents);
        });
        contentEng.forEach(data=>{
            const contents = new QuoteContents(data);
            this.engContents.push(contents);
        });
        images.forEach(data=>{
            this.backgroundImage.push(data.url??"");
        })
    }
}

export class QuoteContents {
    quotation:string;
    name: string;
    source:string;

    constructor(contents:string){
        const split = contents.split('|');
        this.quotation = split[0];
        this.name = split[1];
        this.source = split[2];
    }
}