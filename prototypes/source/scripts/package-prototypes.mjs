import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const client=path.join(root,'dist/client');
const index=readFileSync(path.join(client,'index.html'),'utf8');
const target=path.join(client,'prototypes');
mkdirSync(target,{recursive:true});
cpSync(path.join(client,'assets'),path.join(target,'assets'),{recursive:true});
const pages={
 '':'Цифровая Тюмень — прототипы LEGAL PRO',
 'central-court':'Центральный районный суд — прототип LEGAL PRO',
 'magistrate-2':'Судебный участок № 2 — прототип LEGAL PRO',
 'administration':'Администрация Тюмени — прототип LEGAL PRO',
 'duma':'Тюменская городская Дума — прототип LEGAL PRO',
 'vdpo':'Тюменское ВДПО — прототип LEGAL PRO'
};
for(const [slug,title] of Object.entries(pages)){
 const dir=path.join(target,slug);mkdirSync(dir,{recursive:true});
 writeFileSync(path.join(dir,'index.html'),index.replace(/<title>.*?<\/title>/,`<title>${title}</title>`));
}
writeFileSync(path.join(client,'index.html'),'<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=/prototypes/"><title>Цифровая Тюмень — LEGAL PRO</title></head><body><a href="/prototypes/">Открыть прототипы «Цифровая Тюмень»</a></body></html>');
rmSync(path.join(client,'assets'),{recursive:true});
for(const slug of Object.keys(pages))if(!existsSync(path.join(target,slug,'index.html')))throw Error('Missing route '+slug);
console.log('Prepared 6 direct routes in dist/client/prototypes/. Only this directory is intended for prolg.ru.');
