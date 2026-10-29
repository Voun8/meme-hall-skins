const token=process.env.GITHUB_TOKEN,repo=process.env.GITHUB_REPOSITORY,number=Number(process.env.PR_NUMBER),sha=process.env.HEAD_SHA
if(!token||repo!=='kourou25/meme-hall-skins'||!Number.isSafeInteger(number)||number<1||!/^[a-f0-9]{40}$/.test(sha||''))throw Error('合并参数无效')
const call=async(path,method,body)=>{const r=await fetch(`https://api.github.com/repos/${repo}${path}`,{method,headers:{authorization:`Bearer ${token}`,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','content-type':'application/json'},body:JSON.stringify(body)});const result=await r.json().catch(()=>({}));if(!r.ok)throw Error(`GitHub 操作失败 ${r.status}：${path}`);return result}
const merged=await call(`/pulls/${number}/merge`,'PUT',{sha,merge_method:'squash'});if(!merged.merged)throw Error('投稿未合并')
await call('/actions/workflows/publish-catalog.yml/dispatches','POST',{ref:'main'})
console.log(`投稿 #${number} 已合并，目录发布已启动`)
