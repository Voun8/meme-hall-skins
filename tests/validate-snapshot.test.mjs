import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {validateSnapshot} from '../scripts/validate-snapshot.mjs'

async function make(){const root=await mkdtemp(join(tmpdir(),'skins-check-'));await mkdir(join(root,'public'),{recursive:true});for(const f of ['preview.html','preview.js','serve.mjs','public/title-collection.js','public/title-visuals.js'])await writeFile(join(root,f),'');return root}
test('现有装扮修改、新素材与删除均可通过',async()=>{const r=await make();try{await writeFile(join(r,'public','skin.css'),'.x{color:red}');assert.deepEqual(await validateSnapshot(r,['public/skin.css','public/removed.webp']),{changed:2,passed:true})}finally{await rm(r,{recursive:true,force:true})}})
test('明显语法错误、路径越界和自动化配置修改会给出原因',async()=>{const r=await make();try{await writeFile(join(r,'public','bad.js'),'const =');await assert.rejects(validateSnapshot(r,['public/bad.js']),/JavaScript 语法错误/);await assert.rejects(validateSnapshot(r,['../outside.css']),/路径无效/);await mkdir(join(r,'.github','workflows'),{recursive:true});await writeFile(join(r,'.github','workflows','x.yml'),'');await assert.rejects(validateSnapshot(r,['.github/workflows/x.yml']),/自动化配置/)}finally{await rm(r,{recursive:true,force:true})}})
test('缺失预览运行文件时明确失败',async()=>{const r=await make();try{await rm(join(r,'preview.js'));await assert.rejects(validateSnapshot(r,[]))}finally{await rm(r,{recursive:true,force:true})}})
