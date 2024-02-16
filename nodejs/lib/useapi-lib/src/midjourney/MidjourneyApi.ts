import {instanceToPlain, plainToInstance} from "class-transformer";
import {JobImagineRequest, GetJobResponse, JobImagineResponse, JobButtonRequest, JobButtonResponse } from "./MidjourneyTypes";

export interface MidjourneyApi {
    getJob(jobid:string):Promise<GetJobResponse>;
    // getJobList():Promise<any>;
    // getAccount():Promise<any>;
    jobImagine(request:JobImagineRequest):Promise<JobImagineResponse>;
    jobButton(request:JobButtonRequest):Promise<JobButtonResponse>;
    // jobsBlend(jobid:string):Promise<any>;
    // jobsDescribe(jobid:string):Promise<any>;
    // jobCancel(jobid:string):Promise<any>;
}

export class MidjourneyApiOptions { 
    constructor(
        private token:string,
        private defaultDiscordToken?:string,
        private defaultDiscordServer?:string,
        private defaultDiscordChannel?:string
    ){}

    public getToken():string {
        return this.token;
    }

    public getDefaultDiscordToken():string | undefined {
        return this.defaultDiscordToken;
    }

    public getDefaultDiscordServer():string | undefined {
        return this.defaultDiscordServer;
    }

    public getDefaultDiscordChannel():string | undefined {
        return this.defaultDiscordChannel;
    }
}

export class MidjourneyApiImpl implements MidjourneyApi {
    private options:MidjourneyApiOptions;

    constructor(options:MidjourneyApiOptions){
        this.options = options;
    }

    getDefaultHeader():any {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.options.getToken()}`,
        };
    }

    async getJob(jobid: string): Promise<GetJobResponse> {
        const url = `https://api.useapi.net/v1/jobs/?jobid=${jobid}`;
        let httpRes = await fetch(url, {
            method: "GET",
            headers: this.getDefaultHeader(),
        });
        
        const json = await httpRes.json();
        let response = plainToInstance(GetJobResponse, json) as unknown as GetJobResponse;
        return response;
    }

    async jobImagine(request:JobImagineRequest): Promise<JobImagineResponse> {
        const url = "https://api.useapi.net/v1/jobs/imagine";

        if(!request.discord){
            request.discord = this.options.getDefaultDiscordToken();
        }

        if(!request.server){
            request.server = this.options.getDefaultDiscordServer();
        }

        if(!request.channel){
            request.channel = this.options.getDefaultDiscordChannel();
        }

        let httpRes = await fetch(url, {
            method: "POST",
            headers: this.getDefaultHeader(),
            body: JSON.stringify(instanceToPlain(request))
        });
        
        const json = await httpRes.json();
        let response = plainToInstance(JobImagineResponse, json) as unknown as JobImagineResponse;
        return response;
    }

    async jobButton(request:JobButtonRequest): Promise<JobButtonResponse> {

        if(!request.discord){
            request.discord = this.options.getDefaultDiscordToken();
        }

        const url = "https://api.useapi.net/v1/jobs/button";

        let httpRes = await fetch(url, {
            method: "POST",
            headers: this.getDefaultHeader(),
            body: JSON.stringify(instanceToPlain(request))
        });
        
        const json = await httpRes.json();
        let response = plainToInstance(JobButtonResponse, json) as unknown as JobButtonResponse;
        return response;
    }
}