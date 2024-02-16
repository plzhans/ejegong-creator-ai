import { UrlAttachment } from "./Common";

export interface QutoeImageDto {
    recordId: string;
    parentId?: string;
    quotesIndex?: number;
    quotesText?: string;
    author?: string;
    quotesTextEng?: string;
    authorEng?: string;
    status?: string;
    images?: UrlAttachment[];
    updated?: string;
    midjourneyJobId?: string;
    imageWidth?: number;
    imageHeight?: number;
    imageSize?: number;
}