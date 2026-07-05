#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { generateHwpx } = require('../src/generate');

const pkg = require('../package.json');

function help() {
  console.log(`
hwpx-pyeonram v${pkg.version}
「행정업무운영 편람」(행정안전부) 서식으로 HWPX 문서를 생성합니다.

사용법
  npx hwpx-pyeonram <입력.md> [-o 출력.hwpx] [옵션]
  echo "# 제목" | npx hwpx-pyeonram --stdin -o out.hwpx

옵션
  -o, --out <파일>     출력 경로 (기본: 입력파일명.hwpx)
      --stdin          표준입력에서 콘텐츠를 읽음
      --no-autonum     자동 번호매김 끄기 (제N장/1./가. 자동생성 안 함)
  -h, --help           도움말
  -v, --version        버전

마크다운 매핑
  #     장 제목 (제N장)      ####   가. 항목
  ##    절 제목 (제N절)      #####  1) 항목
  ###   1. 항목             ######  가) 항목
  ※ …  또는  > …  참고       표: …  (표 앞줄)  표 제목
  | a | b |  형태            표
  **굵게**                   본문 내 강조

예시
  npx hwpx-pyeonram 보고서.md -o 보고서.hwpx
`);
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

  let inputPath = null;
  let outPath = null;
  let useStdin = false;
  let autonum = true;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o' || a === '--out') outPath = argv[++i];
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

  try {
    const buf = generateHwpx(content, { autonum });
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    fs.writeFileSync(outPath, buf);
    console.log(`생성 완료: ${outPath}  (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.error('생성 실패:', e.message);
    process.exit(1);
  }
}

main();
