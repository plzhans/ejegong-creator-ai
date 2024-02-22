import { getReadOne, makeQuoteImage } from "./MakeProcess";
import { initConfig } from "./config";
import { sleep } from "./lib/taskLib";

main().then(()=>"exit.").catch(err=>{
    console.error(err);
});

async function main(): Promise<void> {

    const config = await initConfig();
    console.debug("--- initConfig ---");
    console.debug(config);
    console.debug("---");
    
    if(process.argv.includes("--debug-one")){
        const quote = await getReadOne();
        if(quote){
            await makeQuoteImage(quote);
        } else {
            console.info("Notfound queue data.")
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
            console.debug("sleep... 60s");
            await sleep(1000 * 60);
        }
    }
}
