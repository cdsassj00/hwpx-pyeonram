'use strict';
/*
 * 마크다운/일반 텍스트를 편람 콘텐츠 블록 트리로 변환한다.
 *
 * 매핑
 *   #      → 장 제목  (제N장)
 *   ##     → 절 제목  (제N절)
 *   ###    → 1. 항목
 *   ####   → 가. 항목
 *   #####  → 1) 항목
 *   ######→ 가) 항목
 *   ※ …   또는  > …   → 참고
 *   표: …  (표 바로 앞줄)      → 표 제목(캡션)
 *   | a | b |  형태            → 표
 *   그 밖의 문단               → 본문
 *
 * 옵션 autonum=true 이면 제목 텍스트에 번호가 없을 때 자동으로 번호를 붙인다.
 */
const { KO_ORD } = require('./styles');

const HEAD_ROLE = ['chapter', 'section', 'h1', 'h2', 'h3', 'h4'];

// 이미 번호가 붙어있는지 판별
const NUMBERED = /^(제\s*\d+\s*[장절]|\d+\s*\.|[가-힣]\s*\.|\d+\s*\)|[가-힣]\s*\)|\(\s*\d+\s*\))\s*/;

function isTableRow(line) {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|') && t.indexOf('|', 1) > 0;
}
function isSeparatorRow(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
}
function splitRow(line) {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map((s) => s.trim());
}

function parse(input, opts) {
  opts = opts || {};
  const autonum = opts.autonum !== false;
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  const counters = { chapter: 0, section: 0, h1: 0, h2: 0, h3: 0, h4: 0 };
  let pendingCaption = null;

  function resetBelow(level) {
    // level 인덱스보다 하위 카운터 리셋
    for (let i = level + 1; i < HEAD_ROLE.length; i++) counters[HEAD_ROLE[i]] = 0;
  }

  function numberOf(role, text) {
    if (!autonum || NUMBERED.test(text)) return text;
    const idx = HEAD_ROLE.indexOf(role);
    counters[role]++;
    resetBelow(idx);
    const n = counters[role];
    switch (role) {
      case 'chapter': return `제${n}장 ${text}`;
      case 'section': return `제${n}절 ${text}`;
      case 'h1': return `${n}. ${text}`;
      case 'h2': return `${KO_ORD[(n - 1) % KO_ORD.length]}. ${text}`;
      case 'h3': return `${n}) ${text}`;
      case 'h4': return `${KO_ORD[(n - 1) % KO_ORD.length]}) ${text}`;
      default: return text;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // 표
    if (isTableRow(line)) {
      const tbl = [];
      let j = i;
      while (j < lines.length && isTableRow(lines[j].trimEnd())) {
        tbl.push(lines[j].trimEnd());
        j++;
      }
      i = j - 1;
      let header = null;
      const rows = [];
      for (let k = 0; k < tbl.length; k++) {
        if (isSeparatorRow(tbl[k])) continue;
        const cells = splitRow(tbl[k]);
        if (header === null) header = cells;
        else rows.push(cells);
      }
      blocks.push({ type: 'table', header, rows, caption: pendingCaption });
      pendingCaption = null;
      continue;
    }

    // 빈 줄
    if (line.trim() === '') {
      pendingCaption = null;
      blocks.push({ type: 'blank' });
      continue;
    }

    // 헤딩
    const hm = /^(#{1,6})\s+(.*)$/.exec(line);
    if (hm) {
      const level = hm[1].length - 1;               // 0..5
      const role = HEAD_ROLE[level] || 'h4';
      const text = numberOf(role, hm[2].trim());
      blocks.push({ type: role, text });
      continue;
    }

    // 표 캡션 (표 바로 앞줄)
    const cap = /^표\s*[:)]\s*(.*)$/.exec(line);
    if (cap) { pendingCaption = cap[1].trim(); continue; }

    // 참고 (※ 또는 인용부호)
    const noteM = /^(?:※|>)\s*(.*)$/.exec(line);
    if (noteM) {
      blocks.push({ type: 'note', text: '※ ' + noteM[1].trim() });
      continue;
    }

    // 그 밖은 본문
    blocks.push({ type: 'body', text: line.trim() });
  }

  // 끝의 연속 빈 줄 정리
  while (blocks.length && blocks[blocks.length - 1].type === 'blank') blocks.pop();
  return blocks;
}

module.exports = { parse };
