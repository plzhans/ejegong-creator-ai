import {instanceToPlain, plainToInstance} from "class-transformer";
import {JobImagineRequest, GetJobResponse, JobImagineResponse, JobButtonRequest, JobButtonResponse } from "./MidjourneyTypes";
import {Semaphore} from "async-mutex"
import * as Discord from "discord.js"

export interface MidjourneyApi {
    createDiscordClinet(options:Discord.ClientOptions|undefined):Promise<Discord.Client>
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
        private defaultDiscordChannel?:string,
        private jobSemaphore:number = 0
    ){}

    public getToken():string {
        return this.token;
    }

    public getSemaphore():number {
        return this.jobSemaphore ?? 0;
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
    private semaphore:Semaphore|undefined;
    private options:MidjourneyApiOptions;

    constructor(options:MidjourneyApiOptions){
        this.options = options;
        const semaphoreCap = options.getSemaphore();
        if(semaphoreCap > 0){
            this.semaphore = new Semaphore(semaphoreCap);
        }
    }

    async createDiscordClinet(options:Discord.ClientOptions|undefined):Promise<Discord.Client>{
        if (!options){
            options = {
                intents: [
                    Discord.GatewayIntentBits.Guilds,
                    Discord.GatewayIntentBits.GuildMessages,
                    Discord.GatewayIntentBits.MessageContent,
                ]
            }
        }
        const client = new Discord.Client(options);
        const _loginResult = await client.login(this.options.getDefaultDiscordToken());
        return client;
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
        if(!request.discord){
            request.discord = this.options.getDefaultDiscordToken();
        }

        if(!request.server){
            request.server = this.options.getDefaultDiscordServer();
        }

        if(!request.channel){
            request.channel = this.options.getDefaultDiscordChannel();
        }

        const url = "https://api.useapi.net/v1/jobs/imagine";
        const fetchAsync = fetch(url, {
            method: "POST",
            headers: this.getDefaultHeader(),
            body: JSON.stringify(instanceToPlain(request))
        });

        let httpRes:Response;
        if(this.semaphore){
            const [semNumber, releaser] = await this.semaphore.acquire();
            try {
                httpRes = await fetchAsync;
            } finally {
                releaser();
            }
        } else {
            httpRes = await fetchAsync;
        }
        
        const json = await httpRes.json();
        let response = plainToInstance(JobImagineResponse, json) as unknown as JobImagineResponse;
        return response;
    }

    async jobButton(request:JobButtonRequest): Promise<JobButtonResponse> {

        if(!request.discord){
            request.discord = this.options.getDefaultDiscordToken();
        }

        const url = "https://api.useapi.net/v1/jobs/button";
        const fetchAsync = fetch(url, {
            method: "POST",
            headers: this.getDefaultHeader(),
            body: JSON.stringify(instanceToPlain(request))
        });

        let httpRes:Response;
        if(this.semaphore){
            const [semNumber, releaser] = await this.semaphore.acquire();
            try {
                httpRes = await fetchAsync;
            } finally {
                releaser();
            }
        } else {
            httpRes = await fetchAsync;
        }
        
        const json = await httpRes.json();
        let response = plainToInstance(JobButtonResponse, json) as unknown as JobButtonResponse;
        return response;
    }
}