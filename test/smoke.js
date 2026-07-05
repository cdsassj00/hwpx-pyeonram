'use strict';
// 무의존성 스모크 테스트: 전 템플릿 생성·ZIP·참조무결성 자체 검증
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateHwpx } = require('../src/generate');
const { listTemplates, loadTemplate } = require('../src/templates');

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

for (const t of listTemplates()) {
  const tpl = loadTemplate(t.id);
  const buf = generateHwpx(md, { template: t.id, autonum: true });
  assert(Buffer.isBuffer(buf) && buf.length > 1000, `[${t.id}] 버퍼 생성 실패`);
  assert(buf.slice(0, 2).toString() === 'PK', `[${t.id}] ZIP 시그니처 아님`);

  // mimetype 이 첫 엔트리 & STORED 인지 (local header method=0, offset 0)
  assert(buf.readUInt16LE(8) === 0, `[${t.id}] mimetype 이 STORED 아님`);
  assert(buf.slice(30, 38).toString() === 'mimetype', `[${t.id}] 첫 엔트리가 mimetype 아님`);

  // 임시 저장 후 unzip -t
  const tmp = path.join(os.tmpdir(), `smoke-${t.id}.hwpx`);
  fs.writeFileSync(tmp, buf);
  execSync(`unzip -t "${tmp}"`, { stdio: 'ignore' });

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `smk-${t.id}-`));
  execSync(`cd "${dir}" && unzip -qo "${tmp}"`);
  const sec = fs.readFileSync(path.join(dir, 'Contents/section0.xml'), 'utf8');
  const hdr = fs.readFileSync(path.join(dir, 'Contents/header.xml'), 'utf8');

  // 참조 무결성: section0 이 참조하는 style/char/para/borderFill 이 header 에 존재
  for (const [ref, tag] of [
    ['styleIDRef', 'style'], ['charPrIDRef', 'charPr'],
    ['paraPrIDRef', 'paraPr'], ['borderFillIDRef', 'borderFill'],
  ]) {
    const used = new Set([...sec.matchAll(new RegExp(ref + '="(\\d+)"', 'g'))].map((m) => m[1]));
    const have = new Set([...hdr.matchAll(new RegExp('<hh:' + tag + ' id="(\\d+)"', 'g'))].map((m) => m[1]));
    for (const id of used) assert(have.has(id), `[${t.id}] ${tag} #${id} 가 header 에 없음`);
  }
  assert(sec.includes(`charPrIDRef="${tpl.inlineBoldChar}"`), `[${t.id}] 인라인 볼드 미적용`);
  assert(sec.includes(`borderFillIDRef="${tpl.borderFill.header}"`), `[${t.id}] 표 머리행 서식 미적용`);

  // 패키지 참조 무결성: content.hpf/container.rdf 가 참조하는 파트가 실제 ZIP 에 존재
  // (없는 파트를 참조하면 한글이 "손상된 파일"로 판정)
  const present = new Set();
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), r);
      else present.add(r);
    }
  })(dir, '');
  const hpf = fs.readFileSync(path.join(dir, 'Contents/content.hpf'), 'utf8');
  for (const m of hpf.matchAll(/href="([^"]+)"/g)) {
    assert(present.has(m[1]), `[${t.id}] content.hpf 가 참조하는 ${m[1]} 이 패키지에 없음`);
  }
  const rdf = fs.readFileSync(path.join(dir, 'META-INF/container.rdf'), 'utf8');
  for (const m of rdf.matchAll(/rdf:(?:resource|about)="([^"]+)"/g)) {
    if (!m[1] || m[1].includes('://')) continue;
    assert(present.has(m[1]), `[${t.id}] container.rdf 가 참조하는 ${m[1]} 이 패키지에 없음`);
  }

  // header 의 secCnt 가 실제 섹션 파일 수와 일치해야 한다.
  // (불일치 시 한글이 없는 섹션을 찾다가 "손상된 파일"로 판정)
  const secCnt = (hdr.match(/secCnt="(\d+)"/) || [])[1];
  const nSecs = [...present].filter((n) => /^Contents\/section\d+\.xml$/.test(n)).length;
  assert(String(nSecs) === secCnt, `[${t.id}] header secCnt=${secCnt} 와 실제 섹션 수 ${nSecs} 불일치`);

  console.log(`smoke [${t.id.padEnd(8)}] 통과 ✅  (${(buf.length / 1024).toFixed(0)} KB)`);
}
console.log('smoke test 전체 통과 ✅');
