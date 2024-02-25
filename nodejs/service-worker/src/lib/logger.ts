import * as winston from "winston";
import { Logger, LoggerOptions } from "winston";

const options:LoggerOptions = {
    level: (process.env.NODE_ENV === 'production' ? "info" : "debug"),
    format: winston.format.combine(
        winston.format.timestamp(),
    ),
    handleExceptions: true,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.printf(info => {
                    const { timestamp, level, message, sub } = info;
                    const levelString = winston.format.colorize().colorize(level, level.toUpperCase());
                    if(sub){
                        return `[${timestamp}][${levelString}] [${sub}] ${message}`;
                    } else {
                        return `[${timestamp}][${levelString}] ${message}`;
                    }
                })
            )
        }),
        new winston.transports.File({ 
            format:  winston.format.combine(
                winston.format.json()
            ),
            filename: 'logs/app.log' 
        }),
    ],
};

const logger = winston.createLogger(options);
export default logger;

export function createLogger(sub:string, options:any|undefined=undefined):Logger {
    return logger.child({
        sub:sub,
        ...options
    });
}
