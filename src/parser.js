'use strict';
/*
 * 마크다운/일반 텍스트를 콘텐츠 블록 트리로 변환한다.
 *
 * 매핑
 *   #      → chapter    ##     → section
 *   ###    → h1         ####   → h2
 *   #####  → h3         ###### → h4
 *   ※ …  또는  > …            → 참고
 *   표: …  (표 바로 앞줄)       → 표 제목(캡션)
 *   | a | b |  형태             → 표
 *   그 밖의 문단                → 본문
 *
 * 번호매김 스킴 (템플릿별 template.json 의 numbering)
 *   pyeonram : 제N장 / 제N절 / 1. / 가. / 1) / 가)
 *   gov      : Ⅰ. / □ / ○ / - / · / ·        (부처 보고서·지침류)
 *   box      : □ / ○ / - / · / · / ·          (양식·제안서류)
 *   none     : 자동 접두어 없음
 * 템플릿의 bullets 로 레벨별 기호를 덮어쓸 수 있다 (예: {"h1": "ㅇ"}).
 */

const HEAD_ROLE = ['chapter', 'section', 'h1', 'h2', 'h3', 'h4'];

// 한글 자모 순번(가, 나, 다, …)
const KO_ORD = ['가','나','다','라','마','바','사','아','자','차','카','타','파','하',
                '거','너','더','러','머','버','서','어','저','처','커','터','퍼','허'];
const ROMAN = ['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ','Ⅺ','Ⅻ'];

// 이미 번호·기호가 붙어있는지 판별 (자동 접두어 중복 방지)
const NUMBERED = new RegExp(
  '^(제\\s*\\d+\\s*[장절]' +
  '|\\d+\\s*\\.|[가-힣]\\s*\\.|\\d+\\s*\\)|[가-힣]\\s*\\)|\\(\\s*\\d+\\s*\\)' +
  '|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]\\s*\\.?' +
  '|[□■○●◦ㅇ•▪‣·※☞⇒-])\\s*'
);

const SCHEMES = {
  pyeonram: {
    chapter: (n) => `제${n}장 `,
    section: (n) => `제${n}절 `,
    h1: (n) => `${n}. `,
    h2: (n) => `${KO_ORD[(n - 1) % KO_ORD.length]}. `,
    h3: (n) => `${n}) `,
    h4: (n) => `${KO_ORD[(n - 1) % KO_ORD.length]}) `,
  },
  gov: {
    chapter: (n) => `${ROMAN[(n - 1) % ROMAN.length]}. `,
    section: () => '□ ',
    h1: () => '○ ',
    h2: () => '- ',
    h3: () => '· ',
    h4: () => '· ',
  },
  box: {
    chapter: () => '□ ',
    section: () => '○ ',
    h1: () => '- ',
    h2: () => '· ',
    h3: () => '· ',
    h4: () => '· ',
  },
  none: {},
};

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
  const scheme = SCHEMES[opts.numbering || 'pyeonram'] || SCHEMES.pyeonram;
  const bullets = opts.bullets || {};
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  const counters = { chapter: 0, section: 0, h1: 0, h2: 0, h3: 0, h4: 0 };
  let pendingCaption = null;

  function resetBelow(level) {
    for (let i = level + 1; i < HEAD_ROLE.length; i++) counters[HEAD_ROLE[i]] = 0;
  }

  function numberOf(role, text) {
    if (!autonum || NUMBERED.test(text)) return text;
    const idx = HEAD_ROLE.indexOf(role);
    counters[role]++;
    resetBelow(idx);
    if (bullets[role]) {
      const b = bullets[role];
      // "가." 처럼 순번형 기호면 카운터 적용, 그 외에는 고정 기호
      if (b === '가.') return `${KO_ORD[(counters[role] - 1) % KO_ORD.length]}. ${text}`;
      if (b === '1.') return `${counters[role]}. ${text}`;
      return `${b} ${text}`;
    }
    const fn = scheme[role];
    return fn ? fn(counters[role]) + text : text;
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

module.exports = { parse, KO_ORD };
