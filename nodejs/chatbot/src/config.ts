import path from "path";
import { BaseLogger, BaseConfig } from "service-base";

const logger = BaseLogger.createLogger(path.basename(__filename, path.extname(__filename)));

async function getConfiguration():Promise<BaseConfig.Configuration>{
  const map = BaseConfig.getMapByYaml();

  // default
  const defaultBuilder = new BaseConfig.ConfigBuilder();
  defaultBuilder.add("yaml", map);
  defaultBuilder.addEnv();
  const defaultConfig = defaultBuilder.build();

  // final
  const airtableApiKey = defaultConfig.getStringOrThrow("airtable.token");
  const airtableTableBase = defaultConfig.getStringOrThrow("airtable.tables.config").split('/');
  if(airtableTableBase.length < 2){
    logger.error("Invalid config value. name=airtable.tables.config");
    throw new Error("Invalid config value. name=airtable.tables.config");
  }
  const airtableBaseId = airtableTableBase[0];
  const airtableTableId = airtableTableBase[1];

  const airtableConfigMap = await BaseConfig.getAirtableConfigMap(airtableApiKey, airtableBaseId, airtableTableId);
  if (airtableConfigMap.size < 1) {
    logger.error("Airtable config sync fail.");
    throw new Error("Airtable config sync fail.");
  }
  const builder = new BaseConfig.ConfigBuilder();
  builder.addAirtable(`airtable:${airtableBaseId}:${airtableTableId}`, airtableConfigMap);
  builder.add("yaml", map);
  builder.addEnv();
  return builder.build();
}

export async function initConfig():Promise<AppConfig>{
  const configuration = await getConfiguration();
  const config:AppConfig = {
    env: configuration.getStringOrThrow("env"),
    ejecreator: {
      api: {
        url: configuration.getStringOrThrow("ejecreator.api.url"),
        token: configuration.getStringOrThrow("ejecreator.api.token"),
      }
    },
    airtable: {
      token: configuration.getStringOrThrow("airtable.token"),
      tables: {
        config: configuration.getStringOrThrow("airtable.tables.config"),
        quote: configuration.getStringOrThrow("airtable.tables.quote"),
        quote_image: configuration.getStringOrThrow("airtable.tables.quote_image")
      }
    },
    telegram: {
      bot: {
        token : configuration.getStringOrThrow("telegram.bot.token"),
        default_chat_id : configuration.getStringOrThrow("telegram.bot.default_chat_id"),
      }
    },
  };
  _appConfig = config;

  logger.info(`env: ${config.env}`);
  logger.info(`ejecreator.api.url: ${config.ejecreator.api.url}`);
  logger.info(`airtable.tables.config: ${config.airtable.tables.config}`);
  logger.info(`airtable.tables.quote: ${config.airtable.tables.quote}`);
  logger.info(`airtable.tables.quote_image: ${config.airtable.tables.quote_image}`);
  logger.info(`telegram.bot.default_chat_id: ${config.telegram.bot.default_chat_id}`);

  return config;
}

export interface GoogleServiceAccount {
  type: string,
  project_id: string,
  private_key_id: string,
  private_key: string,
  client_email: string,
  client_id: string,
  auth_uri: string,
  token_uri: string,
  auth_provider_x509_cert_url: string,
  client_x509_cert_url: string,
  universe_domain: string,
}

export interface AppConfig{
  env: string,
  ejecreator: {
    api: {
      url: string,
      token: string
    }
  },
  airtable: {
    token: string,
    tables: {
      config: string,
      quote: string,
      quote_image: string
    }
  }
  telegram: {
    bot: {
      token: string,
      default_chat_id: string,
    }
  },
}

let _appConfig:AppConfig|undefined = undefined;

export function getAppConfig():AppConfig{
  if (!_appConfig){
    throw new Error("appConfig is undefined");
  }
  return _appConfig;
}