import fs from 'fs';
import path from 'path';

function loadPackageJson():PublicPackageInfo{
    const mainModulePath = require.main ? require.main.path : path.dirname(process.argv[1]);
    const packageJsonPath = path.join(mainModulePath,'../package.json');
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
    const packageJsonParsed:PublicPackageInfo = JSON.parse(packageJsonContent);
    return packageJsonParsed;
}

let pacakgeJson = loadPackageJson();

export function getPublicPackageInfo():PublicPackageInfo{
    return pacakgeJson;
}

export interface PublicPackageInfo {
    name: string;
    version: string;
}