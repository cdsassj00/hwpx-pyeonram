# hwpx-pyeonram

행정안전부 **「행정업무운영 편람」** 서식 그대로 HWPX(한글) 문서를 만드는 CLI · 라이브러리입니다.
마크다운/텍스트만 넣으면 KoPub 폰트, 장·절·항목 아웃라인, 표 서식이 적용된 `.hwpx`가 나옵니다.

```bash
npx hwpx-pyeonram 보고서.md -o 보고서.hwpx
```

설치 없이 `npx` 한 줄로 실행됩니다. (Node.js 14+ 필요)

---

## 왜 이 도구인가

원본 편람의 정품 `header.xml`(폰트 25종, 글자속성 937개, 문단속성 1,565개, 테두리 838개, 이름스타일 36종)을
**그대로 스타일 백본으로 사용**하고, 콘텐츠 부분(`section0.xml`)만 새로 생성합니다.
따라서 실제 한글에서 열었을 때 서식 깨짐 없이 편람과 동일하게 보입니다.

분석으로 확정한 서식 체계

| 항목 | 값 |
| --- | --- |
| 판형 | 196 × 266 mm (편람 판형), 본문 가용폭 39,572 HWPUNIT |
| 폰트 | KoPub돋움체 / KoPub바탕체 (공공 무료폰트, 비임베딩) |
| 아웃라인 | 장 18pt → 절 14pt → 1. 13pt → 가. 12.5pt → 1) 12.7pt → 본문 12pt |
| 표 | 머리행 연회색 음영 + 4면 실선, 본문행 무채움 + 실선 |

---

## 마크다운 매핑

| 입력 | 결과 | 스타일 |
| --- | --- | --- |
| `# 제목` | 장 제목 (자동 `제N장`) | 장-제목 18pt Bold |
| `## 제목` | 절 제목 (자동 `제N절`) | 절 14pt Bold |
| `### 제목` | `1.` 항목 | 13pt Bold |
| `#### 제목` | `가.` 항목 | 12.5pt Medium |
| `##### 제목` | `1)` 항목 | 12.7pt Medium |
| `###### 제목` | `가)` 항목 | 12pt Medium |
| 일반 문단 | 본문 | 12pt |
| `**굵게**` | 본문 내 강조 | KoPub바탕 Bold 12pt |
| `※ …` 또는 `> …` | 참고 | 10pt 내어쓰기 |
| `표: 캡션` (표 앞줄) | 표 제목 | 10.5pt 가운데 |
| `\| a \| b \|` | 표 | 머리행 음영 |

번호(`제N장`·`1.`·`가.`·`1)`)는 **자동 생성**되며 상·하위 계층에 맞춰 리셋됩니다.
직접 번호를 쓰고 싶으면 `--no-autonum` 옵션을 쓰거나 제목에 이미 번호를 넣으면 됩니다.

---

## CLI

```bash
npx hwpx-pyeonram <입력.md> [-o 출력.hwpx] [옵션]

  -o, --out <파일>    출력 경로 (기본: 입력파일명.hwpx)
      --stdin         표준입력에서 읽기
      --no-autonum    자동 번호매김 끄기
  -h, --help          도움말
  -v, --version       버전
```

```bash
# 파일 입력
npx hwpx-pyeonram report.md -o report.hwpx

# 파이프 입력
cat report.md | npx hwpx-pyeonram --stdin -o report.hwpx
```

---

## 라이브러리 API

```js
const { generateHwpx, parse } = require('hwpx-pyeonram');
const fs = require('fs');

// 마크다운 → HWPX 버퍼
const buf = generateHwpx('# 개요\n본문입니다.', { autonum: true });
fs.writeFileSync('out.hwpx', buf);

// 콘텐츠 블록을 직접 구성해서 넘길 수도 있음
const blocks = [
  { type: 'chapter', text: '제1장 총칙' },
  { type: 'body', text: '이 문서는…' },
  { type: 'table', header: ['구분', '내용'], rows: [['가', '나']], caption: '요약' },
];
fs.writeFileSync('out2.hwpx', generateHwpx('', { blocks }));
```

블록 타입: `chapter · section · h1 · h2 · h3 · h4 · h5 · body · note · divider · blank · table`

---

## 호환성 메모

- 폰트는 임베딩하지 않으므로, KoPub 폰트가 없는 PC에서는 한글이 유사 글꼴로 대체 표시합니다.
  (KoPub 폰트는 무료 배포되며 대부분의 공공기관 PC에 설치되어 있습니다.)
- 셀 병합은 사용하지 않습니다(가이드라인 준수). 단순 직사각형 표만 생성합니다.

## 라이선스

MIT. 본 도구는 공개된 편람의 **서식(스타일)** 만을 재사용하며, 원본 편람의 본문 콘텐츠는 포함하지 않습니다.
