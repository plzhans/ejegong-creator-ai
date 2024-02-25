import dotenv from "dotenv";
import yaml from "js-yaml";
import * as fs from 'fs';
import path from "path";
import Airtable from "airtable";
import { createLogger } from "./lib/logger";

dotenv.config();

const logger = createLogger(path.basename(__filename, path.extname(__filename)));

interface ConfigMap{
  name: string,
  map: Map<string,string>
}

export class ConfigBuilder {

  maps:Array<ConfigMap>;

  constructor(){
    this.maps = new Array<ConfigMap>();
  }
  
  add(name:string, map:Map<string,string>){
    const finalMap = new Map<string, string>();
    map.forEach((value,key)=>{
      const finalKey = key.replace(/__/g, ".");
      finalMap.set(finalKey.toLowerCase(), value);
    });
    this.maps.push({name:name, map:finalMap})
  }

  addEnv(prefix:string="config__"){
    const checkPrefix = prefix.toLocaleLowerCase();
    const map = new Map<string,string>();
    for (const envKey in process.env) {
      if (envKey.toLocaleLowerCase().startsWith(checkPrefix.toLocaleLowerCase())) {
        const finalKey = envKey.slice(checkPrefix.length).replace(/__/g, ".");
        const value = process.env[envKey];
        if(value){
          map.set(finalKey.toLowerCase(), value);
        }
      }
    }
    this.maps.push({name:"env", map:map})
  }

  addAirtable(name:string, input:Map<string,string>){
    const map = new Map<string,string>();
    input.forEach((value, key)=>{
      const finalKey = key.replace(/__/g, ".");
      map.set(finalKey.toLowerCase(), value);
    });
    this.maps.push({name:name, map:map})
  }

  toJson():string {
    return "{}";
  }

  public build():Configuration {
    const configuration = new Configuration(this.maps);
    return configuration;
  };
}

export class Configuration {
  map:Map<string,string>;

  constructor(inputs:Array<ConfigMap>){
    const finalMap = new Map<string,string>();
    inputs.forEach(input => {
      input.map.forEach((value,key)=>{
        finalMap.set(key, value);
      });
    });
    this.map = finalMap;
  }

  getString(name:string):string|undefined{
    let value = this.map.get(name);
    return value;
  }

  getStringOrThrow(name:string):string{
    let value = this.getString(name);
    if(!value){
      throw new Error(`Invalid configuration. name=${name}`);
    }
    return value;
  }
  
  getNumber(name:string):number|undefined{
    let value = this.map.get(name);
    if(!value || value === ""){
      return undefined;
    }

    const number = Number(value);
    if(isNaN(number)){
      return undefined;
    }
    return number;
  }

  getNumberOrThrow(name:string):number{
    let value = this.getNumber(name);
    if(!value){
      throw new Error(`Invalid configuration. name=${name}`);
    }
    return value;
  }
}

function flattenYamlObject(yamlObject: any, parentKey = ''): Map<string, string> {
  const map = new Map<string, string>();

  for (const key in yamlObject) {
    const currentKey = parentKey ? `${parentKey}.${key}` : key;

    if (typeof yamlObject[key] === 'string') {
      map.set(currentKey, yamlObject[key]);
    } else if (typeof yamlObject[key] === 'object') {
      // Recursively handle nested objects
      const nestedMap = flattenYamlObject(yamlObject[key], currentKey);
      nestedMap.forEach((value, nestedKey) => {
        map.set(nestedKey, value);
      });
    }
  }

  return map;
}


function getMapByYaml():Map<string,string>{
  const filePath = path.join('./config/', "default.yaml");
  try {
    const map = new Map<string,string>();

    if(fs.existsSync(filePath)){
      const yamlObject:any = yaml.load(
        fs.readFileSync(filePath, "utf8")
      );
      const flattenedMap = flattenYamlObject(yamlObject);
      flattenedMap.forEach((value,key)=>{
        map.set(key, value);
      });
    } else {
      logger.debug(`Notfound config file. path=${filePath}`);
    }
    return map;
  } catch (err) {
    logger.error(err);
    throw new Error(`yaml load fail. path=${filePath}`);
  }
}

async function getAirtableConfigMap(token:string, baseName:string, tableName:string):Promise<Map<string,string>>{
  const airtable = new Airtable({
      apiKey: token,
  });

  let map = new Map<string,string>();

  const table = airtable.base(baseName).table(tableName);
  await table.select({
      filterByFormula: "{Name}"
  }).eachPage((records,next)=>{
      records.forEach(record=>{
          const name = record.get("Name")?.toString();
          if(name){
          const value = record.get("Value")?.toString() ?? "";
            map.set(name, value);
          }
      });
      next();
  }).catch(err => {
    logger.error(err);
      map.clear();
  })
  return map;
}

async function getConfiguration():Promise<Configuration>{
  const map = getMapByYaml();

  // default
  const defaultBuilder = new ConfigBuilder();
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

  const airtableConfigMap = await getAirtableConfigMap(airtableApiKey, airtableBaseId, airtableTableId);
  if (airtableConfigMap.size < 1) {
    logger.error("Airtable config sync fail.");
    throw new Error("Airtable config sync fail.");
  }
  const builder = new ConfigBuilder();
  builder.addAirtable(`airtable:${airtableBaseId}:${airtableTableId}`, airtableConfigMap);
  builder.add("yaml", map);
  builder.addEnv();
  return builder.build();
}

export async function initConfig():Promise<AppConfig>{
  const configuration = await getConfiguration();
  const config:AppConfig = {
    ejecreator: {
      api: {
        url: configuration.getStringOrThrow("ejecreator.api.url"),
        token: configuration.getStringOrThrow("ejecreator.api.token"),
      }
    },
    google: {
      service_account: JSON.parse(configuration.getStringOrThrow("google.service_account"))
    },
    airtable: {
      token: configuration.getStringOrThrow("airtable.token"),
      tables: {
        config: configuration.getStringOrThrow("airtable.tables.config"),
        quote: configuration.getStringOrThrow("airtable.tables.quote"),
        quote_image: configuration.getStringOrThrow("airtable.tables.quote_image")
      }
    },
    useapi: {
      token: configuration.getStringOrThrow("useapi.token"),
      midjourney: {
        discord_token: configuration.getStringOrThrow("useapi.midjourney.discord_token"),
        discord_server: configuration.getStringOrThrow("useapi.midjourney.discord_server"),
        discord_channel: configuration.getStringOrThrow("useapi.midjourney.discord_channel"),
      }
    },
    telegram: {
      bot: {
        token : configuration.getStringOrThrow("telegram.bot.token"),
        default_chat_id : configuration.getStringOrThrow("telegram.bot.default_chat_id"),
      }
    }
  };
  _appConfig = config;

  logger.info(`ejecreator.api.url: ${config.ejecreator.api.url}`);
  logger.info(`airtable.tables.config: ${config.airtable.tables.config}`);
  logger.info(`airtable.tables.quote: ${config.airtable.tables.quote}`);
  logger.info(`airtable.tables.quote_image: ${config.airtable.tables.quote_image}`);
  logger.info(`useapi.midjourney.discord_server: ${config.useapi.midjourney.discord_server}`);
  logger.info(`useapi.midjourney.discord_channel: ${config.useapi.midjourney.discord_channel}`);
  logger.info(`telegram.bot.default_chat_id: ${config.telegram.bot.default_chat_id}`);
  logger.info(`google.service_account.project_id: ${config.google.service_account.project_id}`);
  logger.info(`google.service_account.client_id: ${config.google.service_account.client_id}`);
  logger.info(`google.service_account.client_email: ${config.google.service_account.client_email}`);
  logger.info(`google.service_account.private_key_id: ${config.google.service_account.private_key_id}`);
  

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
  ejecreator: {
    api: {
      url: string,
      token: string
    }
  },
  google: {
    service_account: GoogleServiceAccount,
  },
  airtable: {
    token: string,
    tables: {
      config: string,
      quote: string,
      quote_image: string
    }
  }
  useapi: {
    token: string,
    midjourney: {
      discord_token: string,
      discord_server: string,
      discord_channel: string,
    }
  }
  telegram: {
    bot: {
      token: string,
      default_chat_id: string,
    }
  }
}

let _appConfig:AppConfig|undefined = undefined;

export function getAppConfig():AppConfig{
  if (!_appConfig){
    throw new Error("appConfig is undefined");
  }
  return _appConfig;
}