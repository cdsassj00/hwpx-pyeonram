'use strict';
/*
 * 「2025 행정업무운영 편람」(행정안전부) 원본 header.xml 에서 직접 검증한
 * 의미론적 역할 → {styleIDRef, paraPrIDRef, charPrIDRef} 매핑.
 *
 * 폰트: KoPub돋움체 / KoPub바탕체 (공공 무료폰트, 비임베딩)
 * 판형: 196×266mm, 본문 가용폭 39,572 HWPUNIT
 */

// 역할별 스타일 (style = 이름붙은 스타일 id, para/char = 해당 스타일의 문단/글자 속성 id)
const ROLE = {
  //  역할        style para  char   설명
  divider:      { style: 1,  para: 33,   char: 789 }, // 간지/대표제목  KoPub돋움 Bold 30pt
  chapter:      { style: 26, para: 2,    char: 64  }, // 장 제목        KoPub돋움 Bold 18pt
  section:      { style: 8,  para: 619,  char: 91  }, // 절 제목        KoPub돋움 Bold 14pt
  h1:           { style: 3,  para: 2,    char: 251 }, // 1.            KoPub돋움 Bold 13pt
  h2:           { style: 4,  para: 859,  char: 340 }, // 가.           KoPub돋움 Medium 12.5pt
  h3:           { style: 5,  para: 779,  char: 426 }, // 1)            KoPub바탕 Medium 12.7pt (들여쓰기)
  h4:           { style: 6,  para: 304,  char: 602 }, // 가)           KoPub돋움 Medium 12pt (들여쓰기)
  h5:           { style: 7,  para: 334,  char: 607 }, // (1)           KoPub바탕 Medium 12pt (들여쓰기)
  body:         { style: 2,  para: 913,  char: 206 }, // 본문          KoPub바탕 Light 12pt
  note:         { style: 9,  para: 876,  char: 338 }, // ※ 참고        KoPub돋움 Light 10pt (내어쓰기)
  tableCaption: { style: 15, para: 57,   char: 34  }, // 표 제목        KoPub돋움 Bold 10.5pt 가운데
  tableHeader:  { style: 16, para: 3,    char: 36  }, // 표 머리행      KoPub돋움 Bold 10pt 가운데
  tableCellL:   { style: 18, para: 972,  char: 355 }, // 표 내용(좌)    KoPub돋움 Light 10pt
  tableCellC:   { style: 19, para: 970,  char: 355 }, // 표 내용(가운데) KoPub돋움 Light 10pt
  blank:        { style: 0,  para: 19,   char: 138 }, // 빈 줄          바탕글
};

// 인라인 **굵게** 용 글자속성 (KoPub바탕체 Bold 12pt)
const INLINE_BOLD_CHAR = 478;

// 표 테두리 (원본 헤더에 존재, 4면 실선)
const BORDERFILL = {
  header: 98, // #E6E6E6 연회색 음영 + 실선
  body: 19,   // 무채움 + 0.12mm 실선
};

// 본문 가용폭 (HWPUNIT) = 페이지폭 55559 - 좌 7370 - 우 8617
const BODY_WIDTH = 39572;

// 한글 자모 순번(가, 나, 다, …) — 가. / 가) 레벨 자동번호용
const KO_ORD = ['가','나','다','라','마','바','사','아','자','차','카','타','파','하',
                '거','너','더','러','머','버','서','어','저','처','커','터','퍼','허'];

module.exports = { ROLE, INLINE_BOLD_CHAR, BORDERFILL, BODY_WIDTH, KO_ORD };
