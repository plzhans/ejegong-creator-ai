import { getAppConfig } from "../config";

export namespace EjeCreator {
    export async function sendSubjectCreate(content_title:string, content_count:number):Promise<boolean> {
        const config = getAppConfig();
        const url = `${config.ejecreator.api.url}?step=subject-create`;
        return await fetch(url, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content_title : content_title,
                content_count : content_count
            })
        }).then(res=>{
            return true;
        }).catch(err=>{
            return false;
        })
    }

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