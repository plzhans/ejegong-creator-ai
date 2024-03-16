// index.js
import path from 'path';
import express from 'express';
import routes from './routes/';
import bodyParser from 'body-parser';
import telegramRoutes from './routes/telegram/routes';

const app = express();
const port = 5001;
app.use(bodyParser.json());

// view engine 템플릿 사용을 명시
app.set('views' , path.join(__dirname, 'views'));
app.set('view engine' , 'ejs');


app.use(routes);
app.use('/telegram', telegramRoutes);

// Start the server
app.listen(port, () => {
    console.debug(`Server is running on http://localhost:${port}`);
});