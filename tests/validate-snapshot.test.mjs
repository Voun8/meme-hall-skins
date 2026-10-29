import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {validateSnapshot} from '../scripts/validate-snapshot.mjs'

async function make(){const root=await mkdtemp(join(tmpdir(),'skins-check-'));await mkdir(join(root,'public'),{recursive:true});for(const f of ['preview.html','preview.js','serve.mjs','public/title-collection.js','public/title-visuals.js'])await writeFile(join(root,f),'');execFileSync('git',['init','-q',root]);execFileSync('git',['-C',root,'add','.']);execFileSync('git',['-C',root,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','baseline']);return root}
test('合法图片和受控配置通过，作者必须匹配',async()=>{const r=await make();try{await mkdir(join(r,'submissions','sample-set','assets'),{recursive:true});await writeFile(join(r,'submissions','sample-set','manifest.json'),JSON.stringify({schemaVersion:1,id:'sample-set',name:'晨光',author:'作者',github:'artist',license:'CC0',permission:true,components:{badge:{file:'assets/badge.png'}}}));await writeFile(join(r,'submissions','sample-set','assets','badge.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1EAAAAASUVORK5CYII=','base64'));const files=['submissions/sample-set/manifest.json','submissions/sample-set/assets/badge.png'];assert.deepEqual(await validateSnapshot(r,files,{actor:'artist',base:'HEAD'}),{changed:2,passed:true});await assert.rejects(validateSnapshot(r,files,{actor:'other',base:'HEAD'}),/作者/)}finally{await rm(r,{recursive:true,force:true})}})
test('投稿不能更改脚本、样式或自动化配置',async()=>{const r=await make();try{for(const name of ['public/bad.js','../outside.css','.github/workflows/x.yml','submissions/sample-set/assets/badge.svg'])await assert.rejects(validateSnapshot(r,[name],{actor:'artist',base:'HEAD'}),/固定目录/)}finally{await rm(r,{recursive:true,force:true})}})
test('缺失预览运行文件时明确失败',async()=>{const r=await make();try{await rm(join(r,'preview.js'));await assert.rejects(validateSnapshot(r,[]))}finally{await rm(r,{recursive:true,force:true})}})
