import { getAppConfig } from "../config";

 

export namespace EjeCreator {
   
    export async function sendStep(step:string, record_id:string):Promise<boolean> {
        const config = getAppConfig();
        const url = `${config.ejecreator.api.url}?env=${config.env}&step=${step}&record_id=${record_id}`;
        return await fetch(url, {
            method: "GET",
        }).then(res=>{
            return true;
        }).catch(err=>{
            return false;
        })
    }
}

export default EjeCreator;