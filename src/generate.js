'use strict';
/*
 * 편람 콘텐츠 블록 트리 → section0.xml 생성 → 정품 템플릿 자산과 함께 .hwpx 로 조립.
 * 원본 「행정업무운영 편람」 header.xml(스타일 백본)을 그대로 사용하므로 한글 호환성 100%.
 */
const fs = require('fs');
const path = require('path');
const { buildZip } = require('./zip');
const { ROLE, INLINE_BOLD_CHAR, BORDERFILL, BODY_WIDTH } = require('./styles');
const { parse } = require('./parser');

const TPL = path.join(__dirname, '..', 'template');
const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>';
const SEC_OPEN =
  '<hs:sec xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" xmlns:epub="http://www.idpf.org/2007/ops" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// **굵게** 구간을 별도 run 으로 분리
function buildRuns(text, baseChar) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/);
  let out = '';
  for (const p of parts) {
    if (!p) continue;
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      out += `<hp:run charPrIDRef="${INLINE_BOLD_CHAR}"><hp:t>${esc(p.slice(2, -2))}</hp:t></hp:run>`;
    } else {
      out += `<hp:run charPrIDRef="${baseChar}"><hp:t>${esc(p)}</hp:t></hp:run>`;
    }
  }
  return out || `<hp:run charPrIDRef="${baseChar}"><hp:t></hp:t></hp:run>`;
}

function lineseg(horz) {
  return `<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1200" textheight="1200" baseline="1020" spacing="600" horzpos="0" horzsize="${horz || BODY_WIDTH}" flags="393216"/></hp:linesegarray>`;
}

function makeGenerator() {
  let pid = 1;          // 문단 id
  let tblSeq = 0;       // 표 일련번호
  const nextPid = () => pid++;

  function paragraph(role, text) {
    const r = ROLE[role] || ROLE.body;
    return `<hp:p id="${nextPid()}" paraPrIDRef="${r.para}" styleIDRef="${r.style}" pageBreak="0" columnBreak="0" merged="0">${buildRuns(text, r.char)}${lineseg()}</hp:p>`;
  }

  function blank() {
    const r = ROLE.blank;
    return `<hp:p id="${nextPid()}" paraPrIDRef="${r.para}" styleIDRef="${r.style}" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${r.char}"><hp:t></hp:t></hp:run>${lineseg()}</hp:p>`;
  }

  function cell(text, header, colAddr, rowAddr, cw, rowH) {
    const bf = header ? BORDERFILL.header : BORDERFILL.body;
    const role = header ? ROLE.tableHeader : ROLE.tableCellL;
    const inner = `<hp:p id="${nextPid()}" paraPrIDRef="${role.para}" styleIDRef="${role.style}" pageBreak="0" columnBreak="0" merged="0">${buildRuns(text, role.char)}${lineseg(cw - 566)}</hp:p>`;
    return (
      `<hp:tc name="" header="${header ? 1 : 0}" hasMargin="1" protect="0" editable="0" dirty="0" borderFillIDRef="${bf}">` +
      `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${inner}</hp:subList>` +
      `<hp:cellAddr colAddr="${colAddr}" rowAddr="${rowAddr}"/>` +
      `<hp:cellSpan colSpan="1" rowSpan="1"/>` +
      `<hp:cellSz width="${cw}" height="${rowH}"/>` +
      `<hp:cellMargin left="283" right="283" top="141" bottom="141"/>` +
      `</hp:tc>`
    );
  }

  function table(block) {
    const header = block.header && block.header.length ? block.header : null;
    const bodyRows = block.rows || [];
    const cols = header ? header.length : (bodyRows[0] || []).length;
    if (!cols) return '';
    // 열 너비 균등 분배
    const base = Math.floor(BODY_WIDTH / cols);
    const widths = [];
    let acc = 0;
    for (let c = 0; c < cols; c++) {
      const w = c === cols - 1 ? BODY_WIDTH - acc : base;
      widths.push(w);
      acc += w;
    }
    const rowH = 500;
    const allRows = [];
    if (header) allRows.push({ cells: header, header: true });
    for (const r of bodyRows) allRows.push({ cells: r, header: false });
    const nrows = allRows.length;

    let trs = '';
    for (let ri = 0; ri < nrows; ri++) {
      const rowObj = allRows[ri];
      let tcs = '';
      for (let ci = 0; ci < cols; ci++) {
        const txt = rowObj.cells[ci] != null ? rowObj.cells[ci] : '';
        tcs += cell(txt, rowObj.header, ci, ri, widths[ci], rowH);
      }
      trs += `<hp:tr>${tcs}</hp:tr>`;
    }

    const tblId = 1000000000 + tblSeq++;
    const tbl =
      `<hp:tbl id="${tblId}" zOrder="${tblSeq}" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${nrows}" colCnt="${cols}" cellSpacing="0" borderFillIDRef="${BORDERFILL.body}" noAdjust="0">` +
      `<hp:sz width="${BODY_WIDTH}" widthRelTo="ABSOLUTE" height="${nrows * rowH}" heightRelTo="ABSOLUTE" protect="0"/>` +
      `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
      `<hp:outMargin left="0" right="0" top="0" bottom="0"/>` +
      `<hp:inMargin left="0" right="0" top="0" bottom="0"/>` +
      trs +
      `</hp:tbl>`;

    return `<hp:p id="${nextPid()}" paraPrIDRef="19" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="138">${tbl}</hp:run>${lineseg()}</hp:p>`;
  }

  return { paragraph, blank, table, firstPidReset: () => { pid = 1; tblSeq = 0; } };
}

// 콘텐츠 블록 → section0.xml 문자열
function buildSectionXml(blocks, secPr) {
  const g = makeGenerator();

  // 첫 문단: secPr + colPr 앵커(빈 문단)
  const anchor =
    `<hp:p id="0" paraPrIDRef="19" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
    `<hp:run charPrIDRef="138">${secPr}<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl></hp:run>` +
    lineseg() +
    `</hp:p>`;

  let body = '';
  for (const b of blocks) {
    switch (b.type) {
      case 'chapter': body += g.paragraph('chapter', b.text); break;
      case 'section': body += g.paragraph('section', b.text); break;
      case 'h1': body += g.paragraph('h1', b.text); break;
      case 'h2': body += g.paragraph('h2', b.text); break;
      case 'h3': body += g.paragraph('h3', b.text); break;
      case 'h4': body += g.paragraph('h4', b.text); break;
      case 'h5': body += g.paragraph('h5', b.text); break;
      case 'note': body += g.paragraph('note', b.text); break;
      case 'divider': body += g.paragraph('divider', b.text); break;
      case 'blank': body += g.blank(); break;
      case 'table':
        if (b.caption) body += g.paragraph('tableCaption', b.caption);
        body += g.table(b);
        break;
      case 'body':
      default:
        body += g.paragraph('body', b.text);
    }
  }

  return XML_DECL + SEC_OPEN + anchor + body + '</hs:sec>';
}

// PrvText.txt 생성(본문 텍스트 미리보기)
function buildPrvText(blocks) {
  const lines = [];
  for (const b of blocks) {
    if (b.text) lines.push(b.text.replace(/\*\*/g, ''));
    else if (b.type === 'table' && b.header) lines.push(b.header.join('  '));
  }
  return lines.join('\r\n').slice(0, 4000) + '\r\n';
}

/**
 * 편람 서식 HWPX 생성.
 * @param {string} input  마크다운/텍스트 콘텐츠
 * @param {object} opts   { autonum?:boolean, blocks?:Array }
 * @returns {Buffer} .hwpx 바이너리
 */
function generateHwpx(input, opts) {
  opts = opts || {};
  const blocks = opts.blocks || parse(input, opts);
  const secPr = fs.readFileSync(path.join(TPL, 'secPr.xml'), 'utf8');

  const sectionXml = buildSectionXml(blocks, secPr);
  const prvText = buildPrvText(blocks);

  const read = (p) => fs.readFileSync(path.join(TPL, p));

  // 원본 편람 header 는 14개 섹션 문서에서 추출되어 secCnt="14" 로 선언되어 있다.
  // 이 패키지는 section0 하나만 담으므로 개수를 맞추지 않으면
  // 한글이 없는 section1~13 을 찾다가 "손상된 파일"로 판정한다.
  const headerXml = read('Contents/header.xml')
    .toString('utf8')
    .replace(/secCnt="\d+"/, 'secCnt="1"');

  // HWPX 규칙: mimetype 이 첫 엔트리, STORED. 나머지 DEFLATE.
  const entries = [
    { name: 'mimetype', data: read('mimetype'), store: true },
    { name: 'version.xml', data: read('version.xml') },
    { name: 'settings.xml', data: read('settings.xml') },
    { name: 'Contents/header.xml', data: Buffer.from(headerXml, 'utf8') },
    { name: 'Contents/section0.xml', data: Buffer.from(sectionXml, 'utf8') },
    { name: 'Contents/content.hpf', data: read('Contents/content.hpf') },
    { name: 'Preview/PrvText.txt', data: Buffer.from(prvText, 'utf8') },
    { name: 'META-INF/container.xml', data: read('META-INF/container.xml') },
    { name: 'META-INF/manifest.xml', data: read('META-INF/manifest.xml') },
    { name: 'META-INF/container.rdf', data: read('META-INF/container.rdf') },
  ];

  return buildZip(entries);
}

module.exports = { generateHwpx, buildSectionXml, parse };
