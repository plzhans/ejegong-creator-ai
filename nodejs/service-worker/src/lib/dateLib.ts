import moment from "moment";

export namespace dateLib {
    export function nowStr():string {
        return moment().format('YYYY.MM.DD HH:mm:ss');
    }
    export function nowFormat(format: string):string {
        return moment().format(format);
    }
}

export default dateLib;