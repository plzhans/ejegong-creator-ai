export class ErrorResponse {
    constructor(
        public code: number,
        public error?: string
    ){}

    public isOk():boolean {
        return this.code == 200
    }
}

export type JobButton = 'U1' | 'U2' | 'U3' | 'U4' | 'V1' | 'V2' | 'V3' | 'V4' |
                        '⬅️' | '➡️' | '⬆️' | '⬇️' | '🔄' |
                        'Vary (Strong)' | 'Vary (Subtle)' | 'Zoom Out 1.5x' | 'Zoom Out 2x' | 'Make Square' |
                        'Upscale (2x)' | 'Upscale (4x)' | 'Redo Upscale (2x)' | 'Redo Upscale (4x)' |
                        'Make Variations' | 'Remaster';
export type JobVerb = 'imagine' | 'button' | 'blend' | 'describe';
export type JobStatus = 'created' | 'started' | 'moderated' | 'progress' | 
                        'completed' | 'failed' | 'cancelled';

export type JobBlendDimensions =  'Portrait' | 'Square' | 'Landscape';

export class JobImagineRequest{
    constructor(
        public prompt: string,
        public discord?: string,
        public server?: string,
        public channel?: string,
        public maxJobs?: number,
        public replyUrl?: string,
        public replyRef?: string
    ){}
}

export class JobImagineResponse extends ErrorResponse{
    constructor(
        code: number,
        public jobid: string,
        public verb: JobVerb,
        public status: JobStatus,
        public created: string,
        public updated: string,
        public prompt: string,
        public channel: string,
        public server: string,
        public maxJobs: number,
        public messageId: string,
        public content: string,
        public timestamp: string
    ){
        super(code, "Ok");
    }
}


export class GetJobResponse extends ErrorResponse{
    constructor(
        code: number,
        public jobid: string,
        public verb: JobVerb,
        public status: JobStatus,
        public created: Date,
        public channel: string,
        public server: string,
        public maxJobs: number,
        public parentJobId?: string,
        public updated?: Date,
        public prompt?: string,
        public blendUrls?: string[],
        public blendDimensions?: JobBlendDimensions,    
        public describeUrl?: string,
        public button?: JobButton,
        public children?: JobChild[],
        public buttons?: JobButton[],
        public messageId?: string,
        public content?: string,
        public timestamp?: Date,
        public attachments?: JobAttachment[],
        public embeds?: JobEmbed[],
    ){
        super(code, "Ok");
    }
}

export class JobChild {
    constructor(
        public messageId: string,
        public button: JobButton,
        public jobid: string
    ){}
}

export class JobAttachment {
    constructor(
        public id: string,
        public content_type: string,
        public filename: string,
        public url: string,
        public proxy_url: string,
        public size: number,
        public width: number,
        public height: number
    ){}
}

export class JobEmbed {
    constructor(
        public type: string,
        public description: string,
        public image: JobImage,
    ){}
}

export class JobImage {
    constructor(
        public url: string,
        public proxy_url: string,
        public width: string,
        public height: string,
    ){}
}

export class JobButtonRequest{
    constructor(
        public jobid: string,
        public button: JobButton,
        public discord?: string,
        public maxJobs?: number,
        public replyUrl?: string,
        public replyRef?: string
    ){}
}

export class JobButtonResponse extends ErrorResponse{
    constructor(
        code: number,
        public jobid: string,
        public verb: JobVerb,
        public status: JobStatus,
        public created: string,
        public updated: string,
        public button: JobButton,
        public parentJobId: string,
        public channel: string,
        public server: string,
        public maxJobs: number
    ){
        super(code, "Ok");
    }
}
