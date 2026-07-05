#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { generateHwpx } = require('../src/generate');
const { listTemplates, DEFAULT_TEMPLATE } = require('../src/templates');

const pkg = require('../package.json');

function templateTable() {
  return listTemplates()
    .map((t) => `  ${t.id.padEnd(10)} ${t.name}  —  ${t.description}`)
    .join('\n');
}

function help() {
  console.log(`
cdsa-hwptemp v${pkg.version}
정부·공공기관 HWPX 서식 문서를 생성합니다. (기본: 행정업무운영 편람)

사용법
  npx cdsa-hwptemp <입력.md> [-o 출력.hwpx] [-t 서식] [옵션]
  echo "# 제목" | npx cdsa-hwptemp --stdin -t bogo -o out.hwpx

옵션
  -o, --out <파일>       출력 경로 (기본: 입력파일명.hwpx)
  -t, --template <서식>  적용할 서식 (기본: ${DEFAULT_TEMPLATE}, 목록은 --list)
      --list             사용 가능한 서식 목록 출력
      --stdin            표준입력에서 콘텐츠를 읽음
      --no-autonum       자동 번호매김·항목기호 끄기
  -h, --help             도움말
  -v, --version          버전

서식 목록
${templateTable()}

마크다운 매핑 (서식에 따라 번호·기호가 달라짐)
  #  장/대제목    ##  절/□ 항목    ###  1. 또는 ○ 항목
  #### 가. 또는 - 항목    ※ … 또는 > …  참고
  표: …  (표 앞줄) 표 제목    | a | b |  표    **굵게**  본문 강조

예시
  npx cdsa-hwptemp 보고서.md -t jichim -o 보고서.hwpx
`);
}

function askTemplate(cb) {
  const list = listTemplates();
  console.log('\n적용할 서식을 선택하세요:');
  list.forEach((t, i) => console.log(`  ${i + 1}) ${t.id.padEnd(10)} ${t.name} — ${t.description}`));
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`번호 입력 (기본 1=${list[0].id}): `, (ans) => {
    rl.close();
    const n = parseInt(ans, 10);
    cb(list[n >= 1 && n <= list.length ? n - 1 : 0].id);
  });
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('-h') || argv.includes('--help') || argv.length === 0) {
    help();
    process.exit(argv.length === 0 ? 1 : 0);
  }
  if (argv.includes('-v') || argv.includes('--version')) {
    console.log(pkg.version);
    process.exit(0);
  }
  if (argv.includes('--list')) {
    console.log(templateTable());
    process.exit(0);
  }

  let inputPath = null;
  let outPath = null;
  let template = null;
  let useStdin = false;
  let autonum = true;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o' || a === '--out') outPath = argv[++i];
    else if (a === '-t' || a === '--template') template = argv[++i];
    else if (a === '--stdin') useStdin = true;
    else if (a === '--no-autonum') autonum = false;
    else if (!a.startsWith('-')) inputPath = a;
    else { console.error(`알 수 없는 옵션: ${a}`); process.exit(1); }
  }

  let content;
  if (useStdin) {
    content = fs.readFileSync(0, 'utf8');
  } else if (inputPath) {
    if (!fs.existsSync(inputPath)) {
      console.error(`입력 파일을 찾을 수 없습니다: ${inputPath}`);
      process.exit(1);
    }
    content = fs.readFileSync(inputPath, 'utf8');
  } else {
    console.error('입력 파일 또는 --stdin 이 필요합니다.');
    process.exit(1);
  }

  if (!outPath) {
    const base = inputPath ? inputPath.replace(/\.[^.]+$/, '') : 'output';
    outPath = base + '.hwpx';
  }
  if (!/\.hwpx$/i.test(outPath)) outPath += '.hwpx';

  function run(tplId) {
    try {
      const buf = generateHwpx(content, { template: tplId, autonum });
      fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
      fs.writeFileSync(outPath, buf);
      console.log(`생성 완료: ${outPath}  (서식: ${tplId}, ${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.error('생성 실패:', e.message);
      process.exit(1);
    }
  }

  if (template) run(template);
  else if (!useStdin && process.stdin.isTTY && process.stdout.isTTY) askTemplate(run);
  else run(DEFAULT_TEMPLATE);
}

main();
