import {test} from 'node:test'
import assert from 'node:assert/strict'
import {assessment,issueTitle,reconcile} from '../scripts/monitor-checks.mjs'
const now=Date.parse('2026-10-29T08:00:00Z'),run=(extra={})=>({id:42,status:'in_progress',created_at:new Date(now-16*60000).toISOString(),...extra})
test('等待中超过15分钟提示，正常运行和成功不报异常',()=>{assert.match(assessment(run(),now),/15分钟/);assert.equal(assessment(run({created_at:new Date(now-2*60000).toISOString()}),now),null);assert.equal(assessment(run({status:'completed',conclusion:'success'}),now),null);assert.match(assessment(run({status:'completed',conclusion:'failure'}),now),/未通过/)})
test('异常只创建一次，同一条恢复成功后关闭',async()=>{const issues=[],log=[],ctx={issues,now,create:async(title,body)=>{log.push('create');issues.push({number:1,title,body})},update:async()=>log.push('update'),close:async()=>log.push('close')};await reconcile({...ctx,run:run()});await reconcile({...ctx,run:run()});assert.deepEqual(log,['create']);assert.equal(issues[0].title,issueTitle(42));await reconcile({...ctx,run:run({status:'completed',conclusion:'success'})});assert.deepEqual(log,['create','close'])})
