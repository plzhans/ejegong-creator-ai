import { getReadOne, isProcessEnabled, makeQuoteImage } from "./MakeProcess";
import { initConfig } from "./config";
import { sleep } from "./lib/taskLib";
import { createLogger } from "./lib/logger";
import path from "path";
import telegramLib from "./lib/telegramLib";
import os from 'os';


const logger = createLogger(path.basename(__filename, path.extname(__filename)));

logger.info(`start. NODE_ENV=${process.env.NODE_ENV}`)

main().then(()=>"exit.").catch(err=>{
    logger.error(err);
});

async function main(): Promise<void> {
    await initConfig();
    await onStart();
    
    if(process.argv.includes("--debug-one")){
        logger.info(`process start. --debug-one`);
        if(await isProcessEnabled()){
            const quote = await getReadOne();
            if(quote){
                await makeQuoteImage(quote);
            } else {
                logger.info("Notfound queue data.");
            }
        } else {
            logger.info("process disabled.");
        }
        
    } else {
        logger.info(`process start.`);
        while(true){
            if(await isProcessEnabled()){
                const quote = await getReadOne();
                if(quote){
                    await makeQuoteImage(quote);
                    while(true){
                        if(await isProcessEnabled()){
                            const quote = await getReadOne();
                            if(!quote){
                                break;
                            }
                            await makeQuoteImage(quote);
                            await sleep(1000);
                        }
                    }
                }
            }
            logger.debug("sleep... 60s");
            await sleep(1000 * 60);
        }
    }
}

let exiting = false;
let startTelegramMessageId:number|undefined;

async function onStart(): Promise<void> {

    process.on('beforeExit', async (code) => {
        if(exiting){
            return;
        }
        exiting = true;
        onExit(code);
    });
    
    if (process.env.NODE_ENV === 'production'){
        const message = [
            `[SYSTEM][service-woker] start.`,
            //`>> version : ${process.version}`,
            `>> hostname: ${os.hostname}`
        ].join('\n');

        const result = await telegramLib.sendMessage(message);
        if(result){
            startTelegramMessageId = result.message_id;
        }
    }
}

async function onExit(code:number): Promise<void> {
    if (process.env.NODE_ENV === 'production'){
        const message = [
            `[SYSTEM][service-woker] stop.`,
            //`>> version : ${process.version}`,
            `>> hostname: ${os.hostname}`,
            "",
            `exit_code : ${code}`,
        ].join('\n');

        await telegramLib.sendMessage(message, {
            reply_to_message_id: startTelegramMessageId
        });
    }
}