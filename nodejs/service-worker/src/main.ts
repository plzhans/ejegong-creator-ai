import { getReadOne, makeQuoteImage } from "./MakeProcess";
import { initConfig } from "./config";
import { sleep } from "./lib/taskLib";
import { createLogger } from "./lib/logger";
import path from "path";

const logger = createLogger(path.basename(__filename, path.extname(__filename)));

main().then(()=>"exit.").catch(err=>{
    logger.error(err);
});

async function main(): Promise<void> {
    await initConfig();
    
    if(process.argv.includes("--debug-one")){
        const quote = await getReadOne();
        if(quote){
            await makeQuoteImage(quote);
        } else {
            logger.info("Notfound queue data.")
        }
    } else {
        while(true){
            const quote = await getReadOne();
            if(quote){
                await makeQuoteImage(quote);
                while(true){
                    const quote = await getReadOne();
                    if(!quote){
                        break;
                    }
                    await makeQuoteImage(quote);
                    await sleep(1000);
                }
            }
            logger.debug("sleep... 60s");
            await sleep(1000 * 60);
        }
    }
}
