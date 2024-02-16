import dotenv from "dotenv";
import yaml from "js-yaml";
import { readFileSync } from "fs";
import { join } from "path";
import { isEmpty } from "lodash";

// .env 파일로부터 환경변수 값을 읽어와서 사용한다.
dotenv.config();

// APP_CONFIG_FILE 환경변수에 YAML 파일의 경로가 정의되어 있다면 경로를 불러온다. 
const yaml_config_filename = process.env.APP_CONFIG_FILE;
let yaml_config:AppConfig;
try {
  const custom_config:any = yaml_config_filename
    ? yaml.load(readFileSync(yaml_config_filename, "utf8"))
    : {};
  const default_config:any = yaml.load(
    readFileSync(join('./config/', "default.yaml"), "utf8")
  );
  yaml_config = {
    ...default_config,
    ...custom_config,
  };
} catch (err) {
  console.error(err);
  throw new Error("error");
}

export interface AirtableSchemaItemConfig {
  base: string,
  table: string
}

export interface AirtableSchemaConfig {
  quote: AirtableSchemaItemConfig
  quote_image: AirtableSchemaItemConfig
}

export interface AirtableConfig {
  token: string,
  schema: AirtableSchemaConfig
}

export interface AppConfig{
  airtable: AirtableConfig
  useapi: UseapiConfig
}

export interface UseapiConfig {
  token: string,
  midjourney: MidjourneyConfig
}

export interface MidjourneyConfig {
  discord_token: string,
  discord_server: string,
  discord_channel: string,
}

// config 우선순위 (환경변수 > APP_CONFIG_FILE 경로의 YAML > default)
const _config: AppConfig = {
  airtable: {
    token: process.env.AIRTABLE_TOKEN ?? yaml_config.airtable?.token,
    schema: {
      quote: {
        base: process.env.AIRTABLE_SCHEMA_QUOTE_BASE ?? yaml_config.airtable?.schema?.quote?.base,
        table: process.env.AIRTABLE_SCHEMA_QUOTE_TABLE ?? yaml_config.airtable?.schema?.quote?.table
      },
      quote_image: {
        base: process.env.AIRTABLE_SCHEMA_QUOTE_IMAGE_BASE ?? yaml_config.airtable?.schema?.quote_image?.base,
        table: process.env.AIRTABLE_SCHEMA_QUOTE_IMAGE_TABLE ?? yaml_config.airtable?.schema?.quote_image?.table
      }
    }
  },
  useapi: {
    token: process.env.USEAPI_TOKEN ?? yaml_config.useapi?.token,
    midjourney: {
      discord_token : process.env.USEAPI_MIDJOURNEY_DISCORD_TOKEN ?? yaml_config.useapi?.midjourney?.discord_token,
      discord_server : process.env.USEAPI_MIDJOURNEY_DISCORD_SERVER ?? yaml_config.useapi?.midjourney?.discord_server,
      discord_channel : process.env.USEAPI_MIDJOURNEY_DISCORD_CHANNEL ?? yaml_config.useapi?.midjourney?.discord_channel,
    }
  }
};

if (isEmpty(_config.airtable.token)){
  throw new Error("config airtable.token empty.");
}
if (isEmpty(_config.airtable.schema.quote.base)){
  throw new Error("config airtable.schema.quote.base empty.");
}
if (isEmpty(_config.airtable.schema.quote.table)){
  throw new Error("config airtable.schema.quote.table empty.");
}
if (isEmpty(_config.useapi.token)){
  throw new Error("config useapi.token empty.");
}

if (isEmpty(_config.useapi.midjourney.discord_token)){
  throw new Error("config useapi.midjourney.discord_token empty.");
}

if (isEmpty(_config.useapi.midjourney.discord_server)){
  throw new Error("config useapi.midjourney.discord_server empty.");
}

if (isEmpty(_config.useapi.midjourney.discord_channel)){
  throw new Error("config useapi.midjourney.discord_channel empty.");
}

export const config = _config;