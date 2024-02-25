import { getAppConfig } from "../config";

 

export namespace EjeCreator {
    export async function sendImageConfirmYes(recordId:string):Promise<boolean> {
        const config = getAppConfig();
        const url = `${config.ejecreator.api.url}?step=image-confirm-yes&record_id=${recordId}`;
        return await fetch(url, {
            method: "GET"
        }).then(res=>{
            return true;
        }).catch(err=>{
            return false;
        })
    }
}

export default EjeCreator;