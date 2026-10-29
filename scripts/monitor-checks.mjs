import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const delayedMs=15*60*1000
export function assessment(run,now=Date.now()){
 if(!run||!Number.isSafeInteger(Number(run.id)))throw Error('运行记录无效')
 const pending=['queued','in_progress','waiting','pending','requested'].includes(run.status)
 if(pending&&Number.isFinite(Date.parse(run.created_at))&&now-Date.parse(run.created_at)>=delayedMs)return '检查超过15分钟仍未完成'
 if(run.status==='completed'&&['failure','timed_out','cancelled','action_required','startup_failure'].includes(run.conclusion))return '检查未通过或被中断'
 return null
}
export function issueTitle(id){return `[装扮自动化] 检查异常 #${Number(id)}`}
export async function reconcile({run,issues,create,update,close,now=Date.now()}){
 const title=issueTitle(run.id),existing=issues.find(x=>x.title===title),reason=assessment(run,now)
 if(!reason){if(existing&&run.status==='completed'&&run.conclusion==='success')await close(existing.number);return}
 const url=`https://github.com/kourou25/meme-hall-skins/actions/runs/${Number(run.id)}`
 const body=`${reason}。\n\n请查看 [GitHub 运行记录](${url})；自动上线目前尚未接通，检查通过也不表示网站已更新。\n\n运行编号：${Number(run.id)}\n`
 if(existing){if(existing.body!==body)await update(existing.number,body)}else await create(title,body)
}
async function main(){
 const token=process.env.GITHUB_TOKEN,repo=process.env.GITHUB_REPOSITORY
 if(!token||repo!=='kourou25/meme-hall-skins')throw Error('缺少本仓库监控权限')
 const request=async(path,method='GET',body)=>{const r=await fetch(`https://api.github.com/repos/${repo}${path}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error(`GitHub 请求失败 ${r.status}：${path}`);return r.status===204?null:r.json()}
 if(process.env.MONITOR_SELF_TEST==='true'){
  const issue=await request('/issues','POST',{title:'[装扮自动化自检] 提醒权限验证',body:'这是自动创建并关闭的测试记录，不是实际故障。',assignees:['kourou25']})
  try{const found=await request('/issues/'+issue.number);if(!found.assignees?.some(x=>x.login==='kourou25'))throw Error('测试提醒没有指派站长')}
  finally{await request('/issues/'+issue.number,'PATCH',{state:'closed'})}
  console.log(`提醒自检完成：${issue.html_url}`);return
 }
 const issues=(await request('/issues?state=open&per_page=100')).filter(x=>!x.pull_request)
 const input=process.env.WATCH_RUN_ID
 const runs=input?[await request('/actions/runs/'+Number(input))]:(await request('/actions/workflows/check-skins.yml/runs?per_page=30')).workflow_runs
 for(const run of runs)await reconcile({run,issues,create:async(title,body)=>{const issue=await request('/issues','POST',{title,body,assignees:['kourou25']});issues.push(issue)},update:(n,body)=>request('/issues/'+n,'PATCH',{body}),close:n=>request('/issues/'+n,'PATCH',{state:'closed'})})
 console.log(`已检查 ${runs.length} 条 GitHub 检查记录`)
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main()
