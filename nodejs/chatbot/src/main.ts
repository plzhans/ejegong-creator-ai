// index.js
import path from 'path';
import express from 'express';
import routes from './routes/';
import bodyParser from 'body-parser';
import telegramRoutes from './routes/telegram/routes';
import telegramBot from './lib/telegramBot';
import { telegramEventMessage, telegramEventCallbackQuery } from './telegram/event';
import { initConfig } from './config';
import { BaseLogger } from 'service-base';
import CommandShorts from './telegram/command_shorts';

const logger = BaseLogger.createLogger(path.basename(__filename, path.extname(__filename)));

logger.info(`start. NODE_ENV=${process.env.NODE_ENV}`)

main().then(()=>"exit.").catch(err=>{
    logger.error(err);
});

async function main(): Promise<void> {
    await initConfig();

    const app = express();
    const port = 5001;
    app.use(bodyParser.json());

    // view engine 템플릿 사용을 명시
    app.set('views' , path.join(__dirname, 'views'));
    app.set('view engine' , 'ejs');

    app.use(routes);
    app.use('/telegram', telegramRoutes);

    //
    telegramBot.onSetMyCommands([
        ...CommandShorts.getMyCommands()
    ]);
    telegramBot.onMessage(telegramEventMessage);
    telegramBot.onChannelPost(telegramEventMessage);
    telegramBot.onCallbackQuery(telegramEventCallbackQuery);
    telegramBot.onStarted();

    // Start the server
    app.listen(port, () => {
        console.debug(`Server is running on http://localhost:${port}`);
    });
}


