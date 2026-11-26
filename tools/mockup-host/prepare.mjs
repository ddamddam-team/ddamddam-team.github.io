import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';

const source = new URL('../../mockups/', import.meta.url);
const output = new URL('./.assets/', import.meta.url);
async function validate(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('목업에 심볼릭 링크를 포함할 수 없습니다.');
    if (entry.isDirectory()) await validate(new URL(`${encodeURIComponent(entry.name)}/`, directory));
  }
}
await validate(source);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, new URL('mockups/', output), {
  recursive: true,
  filter: path => !relative(fileURLToPath(source), path).split('/').some(part => part.startsWith('.')),
});
const escape = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encodePath = value => value.split('/').map(encodeURIComponent).join('/');
const projectName = name => name === 'place' ? '장소' : name;
function page(title, description, cards, back = '') {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(title)} · 오운완 목업</title><style>
*{box-sizing:border-box}body{margin:0;background:#f6f8fc;color:#182334;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif}main{max-width:960px;margin:auto;padding:64px 24px}header{border-bottom:1px solid #dfe5ee;padding-bottom:32px;margin-bottom:32px}.brand{font-weight:800;color:#2463eb;font-size:16px}h1{font-size:36px;letter-spacing:-1px;margin:24px 0 12px}p{color:#5d697b;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px}a{color:inherit}.card{display:block;text-decoration:none;background:white;border:1px solid #dfe5ee;border-radius:16px;padding:26px;transition:border-color .15s,box-shadow .15s}.card:hover{border-color:#2463eb;box-shadow:0 8px 24px #2463eb12}.card:focus-visible,.back:focus-visible{outline:3px solid #2463eb;outline-offset:4px}.card h2{font-size:21px;margin:0 0 12px;overflow-wrap:anywhere}.card p{font-size:16px;margin:0;overflow-wrap:anywhere}.back{display:inline-block;margin-bottom:24px;color:#2463eb;text-underline-offset:4px}.empty{padding:24px;background:white;border-radius:16px}footer{margin-top:40px;color:#637086;font-size:14px}@media(max-width:600px){main{padding:36px 20px}h1{font-size:30px}}
</style></head><body><main>${back}<header><div class="brand">오운완 · 팀 목업</div><h1>${escape(title)}</h1><p>${escape(description)}</p></header><div class="grid">${cards || '<p class="empty">아직 등록된 HTML 목업이 없어요.</p>'}</div><footer>팀 내부 기획·개발용</footer></main></body></html>`;
}
async function htmlFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await htmlFiles(new URL(`${encodeURIComponent(entry.name)}/`, directory), path + '/'));
    else if (/\.html?$/i.test(entry.name)) files.push(path);
  }
  return files.sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
}
await mkdir(new URL('.catalog/', output), { recursive: true });
const projects = (await readdir(source, { withFileTypes: true }))
  .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
  .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
const projectCards = [];
for (const project of projects) {
  const name = project.name;
  const files = await htmlFiles(new URL(`${encodeURIComponent(name)}/`, source));
  projectCards.push(`<a class="card" href="/mockups/${encodeURIComponent(name)}/"><h2>${escape(projectName(name))}</h2><p>HTML 목업 ${files.length}개 · ${escape(name)}</p></a>`);
  const cards = files.map(file => `<a class="card" href="/mockups/${encodeURIComponent(name)}/${encodePath(file)}"><h2>${escape(file.replace(/\.html?$/i, ''))}</h2><p>${escape(file)}</p></a>`).join('');
  await writeFile(new URL(`.catalog/${encodeURIComponent(name)}.html`, output), page(projectName(name), '확인할 HTML 목업을 선택하세요.', cards, '<a class="back" href="/mockups/">전체 프로젝트</a>'));
}
await writeFile(new URL('.catalog/index.html', output), page('프로젝트 둘러보기', '프로젝트를 선택하고 기획·개발 중인 화면을 확인하세요.', projectCards.join('')));
console.log('인증 서버용 목업 파일 준비 완료');
