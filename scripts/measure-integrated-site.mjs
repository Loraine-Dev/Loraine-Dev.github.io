import {chromium} from 'playwright';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const run=promisify(execFile),out='artifacts/v1-integration/performance';await mkdir(out,{recursive:true});const results=[];
for(let i=1;i<=3;i++){
 const path=`${out}/mobile-${i}.json`;
 await run(process.execPath,['node_modules/lighthouse/cli/index.js','http://127.0.0.1:4177/','--chrome-path='+chromium.executablePath(),'--chrome-flags=--headless --enable-unsafe-swiftshader --no-sandbox','--only-categories=performance,accessibility,best-practices,seo','--output=json','--output-path='+path,'--save-assets','--quiet'],{maxBuffer:2e6});
 const report=JSON.parse(await readFile(path,'utf8'));
 results.push({run:i,performance:Math.round(report.categories.performance.score*100),accessibility:Math.round(report.categories.accessibility.score*100),seo:Math.round(report.categories.seo.score*100),lcp:report.audits['largest-contentful-paint'].numericValue,tbt:report.audits['total-blocking-time'].numericValue,cls:report.audits['cumulative-layout-shift'].numericValue,environment:report.environment,settings:report.configSettings});
 console.log(JSON.stringify(results.at(-1)));
}
await writeFile(`${out}/summary.json`,JSON.stringify(results,null,2));
