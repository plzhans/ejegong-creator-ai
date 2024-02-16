export class HttpLib {

    static async downloadAsBase64(url: string): Promise<string|undefined>{
        const res = await fetch(url, {
            method: "GET"
        });
        if (res.ok){
            const array = await res.arrayBuffer();
            const base64 = Buffer.from(array).toString('base64');
            return base64;
        } else {
            return undefined;
        }
    }
}