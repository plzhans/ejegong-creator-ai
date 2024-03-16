import dotenv from "dotenv";
import yaml from "js-yaml";
import * as fs from 'fs';
import path from "path";
import { createLogger } from "./logger";
import Airtable from "airtable";

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


export function getMapByYaml():Map<string,string>{
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

export async function getAirtableConfigMap(token:string, baseName:string, tableName:string):Promise<Map<string,string>>{
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