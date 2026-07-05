'use strict';
// 무의존성 스모크 테스트: 생성·ZIP·참조무결성 자체 검증
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateHwpx } = require('../src/generate');

const md = [
  '# 테스트 개요',
  '## 첫째 절',
  '### 항목 하나',
  '본문에 **강조** 와 특수문자 & < > · ※ 포함.',
  '#### 세부 항목',
  '표: 샘플 표',
  '| A | B |',
  '| --- | --- |',
  '| 1 | 2 |',
  '※ 참고 문구.',
].join('\n');

const buf = generateHwpx(md, { autonum: true });
assert(Buffer.isBuffer(buf) && buf.length > 1000, '버퍼 생성 실패');
assert(buf.slice(0, 2).toString() === 'PK', 'ZIP 시그니처 아님');

// mimetype 이 첫 엔트리 & STORED 인지 (local header method=0, offset 0)
assert(buf.readUInt16LE(8) === 0, 'mimetype 이 STORED 아님');
assert(buf.slice(30, 38).toString() === 'mimetype', '첫 엔트리가 mimetype 아님');

// 임시 저장 후 unzip -t
const tmp = path.join(os.tmpdir(), 'smoke.hwpx');
fs.writeFileSync(tmp, buf);
execSync(`unzip -t "${tmp}"`, { stdio: 'ignore' });

// 참조 무결성: section0 이 참조하는 style/char/para/borderFill 이 header 에 존재
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smk-'));
execSync(`cd "${dir}" && unzip -qo "${tmp}"`);
const sec = fs.readFileSync(path.join(dir, 'Contents/section0.xml'), 'utf8');
const hdr = fs.readFileSync(path.join(dir, 'Contents/header.xml'), 'utf8');
for (const [ref, tag] of [
  ['styleIDRef', 'style'], ['charPrIDRef', 'charPr'],
  ['paraPrIDRef', 'paraPr'], ['borderFillIDRef', 'borderFill'],
]) {
  const used = new Set([...sec.matchAll(new RegExp(ref + '="(\\d+)"', 'g'))].map(m => m[1]));
  const have = new Set([...hdr.matchAll(new RegExp('<hh:' + tag + ' id="(\\d+)"', 'g'))].map(m => m[1]));
  for (const id of used) assert(have.has(id), `${tag} #${id} 가 header 에 없음`);
}
assert(sec.includes('charPrIDRef="478"'), '인라인 볼드 미적용');
assert(sec.includes('borderFillIDRef="98"'), '표 헤더 음영 미적용');
console.log('smoke test 통과 ✅');
