---
name: cdsa-hwptemp
description: >
  정부·공공기관 서식 그대로 HWPX(한글) 문서를 생성하는 스킬. 행정업무운영 편람,
  부처 업무보고, 실행지침, 강의계획서, 자문의견서, 교육 제안서, 공모 계획안 등
  여러 디자인 서식을 지원하며, 각 서식의 정품 원본에서 추출한 header.xml(폰트·아웃라인·표
  서식)을 스타일 백본으로 사용하므로 실제 한글에서 열었을 때 원본과 동일하게 보인다.
  사용자가 "운영편람 양식", "편람 서식 hwpx", "업무보고 서식", "지침 양식", "강의계획서
  한글파일", "제안서 서식으로", "공문서 서식 hwpx", "정부 서식 한글 문서" 등을 언급하면
  항상 이 스킬을 사용한다. 마크다운/텍스트 등 어떤 콘텐츠든 선택한 서식의 HWPX로 변환한다.
---

# HWPX 정부·공공기관 서식 문서 생성 스킬

## 핵심 원칙

각 서식의 정품 원본에서 추출한 `templates/<서식>/Contents/header.xml`을 **그대로**
스타일 백본으로 쓰고 콘텐츠(`section0.xml`)만 새로 생성한다. 절대 빈 헤더를 새로
만들지 않는다. 헤더에 이미 있는 스타일 ID만 참조하므로 한글 호환성 100%.

## 워크플로우

### Step 0 — 서식 선택 (반드시 사용자에게 확인)

사용자가 서식을 명시하지 않았다면 **생성 전에 어떤 서식을 적용할지 질문한다**
(AskUserQuestion 사용 권장). 요청 문맥상 서식이 명백하면(예: "편람 양식으로") 생략한다.

| id | 서식 | 어울리는 문서 |
| --- | --- | --- |
| `pyeonram` | 행정업무운영 편람 | 공식 편람·매뉴얼, 제N장/제N절 구조의 장문 보고서 |
| `bogo` | 부처 업무보고 | 정부 업무보고·정책 보고 자료 (Ⅰ. / □ / ㅇ) |
| `jichim` | 실행지침·실무 가이드 | 내부 지침, 실무 가이드, 원칙 문서 |
| `lecture` | 강의계획서·교육과정 | 교육과정 개요, 강의·훈련 계획 |
| `opinion` | 자문의견서·심사 양식 | 위원회 의견서, 심사·평가 양식 |
| `proposal` | 교육 제안서 | 교육·사업 제안서, 과정 소개 |
| `gongmo` | 공모·포상 계획안 | 공모 계획안, 포상·추천 공고 |

목록은 `node bin/cli.js --list` 로도 확인할 수 있다.

### Step 1 — 콘텐츠를 마크다운으로 정리

사용자 요청/자료를 아래 매핑에 맞춰 마크다운으로 구성한다.
번호·항목기호는 서식에 따라 자동으로 달라진다(편람: 제N장/1./가., 업무보고·지침: Ⅰ./□/○/-, 양식류: □/○/-).

| 마크다운 | 역할 (서식별 자동 번호·기호) |
| --- | --- |
| `# 제목` | 장/대제목 |
| `## 제목` | 절 또는 □ 항목 |
| `### 제목` | 1. 또는 ○ 항목 |
| `#### 제목` | 가. 또는 - 항목 |
| `##### 제목` | 1) 또는 · 항목 |
| `###### 제목` | 가) 또는 · 항목 |
| 일반 문단 | 본문 |
| `**굵게**` | 본문 내 강조 |
| `※ …` / `> …` | 참고 |
| `표: 캡션` + `\| a \| b \|` | 표(캡션 포함) |

직급/연차/직책 표현은 쓰지 말고 "여러분"으로 통일한다.
시적·상징적 문체를 피하고 실무 중심 서술식으로 쓴다.

### Step 2 — 생성기 실행

스킬(저장소) 디렉토리에서 CLI로 실행한다. `-t` 로 서식을 지정한다.

```bash
node bin/cli.js 입력.md -t bogo -o 문서명.hwpx
# 또는 GitHub 배포본으로
npx cdsassj00/cdsa-hwptemp 입력.md -t jichim -o 문서명.hwpx
```

라이브러리로 직접 호출도 가능하다.

```js
const { generateHwpx } = require('./src/generate');
const fs = require('fs');
fs.writeFileSync('문서명.hwpx',
  generateHwpx(markdownString, { template: 'lecture', autonum: true }));
```

### Step 3 — 검증 후 제공

생성 후 `node test/smoke.js` 로 무결성을 확인(스타일 참조·패키지 파트 참조·secCnt)하고
사용자에게 제공한다. 한/글이 설치된 환경이면 COM(HWPFrame.HwpObject)으로 실제 열림도
확인할 수 있다.

## 새 서식 추가 (계속 업데이트)

1. 원본 `.hwpx` 를 `template-sources/` 에 두고 백본 추출:
   `python tools/extract_template.py 원본.hwpx templates/<새아이디>`
2. 원본 section0 문단들의 (paraPrIDRef, charPrIDRef) 조합을 분석해
   `templates/<새아이디>/template.json` 의 `role`(chapter/section/h1~h5/body/note/표)과
   `borderFill`, `inlineBoldChar`, `numbering`(pyeonram|gov|box|none)을 채운다.
3. `node test/smoke.js` 로 검증 → 통과하면 커밋.

## ⚠️ 하지 말 것

1. header.xml을 새로 만들거나 임의로 잘라내기 → 참조 깨짐. 원본 유지.
   (단, 패키징 시 secCnt는 실제 섹션 수로 자동 보정됨)
2. 존재하지 않는 스타일 ID 참조 → 한글이 무시하거나 손상 판정.
   각 서식 `template.json`의 검증된 ID만 사용.
3. 셀 병합 사용 → 단순 직사각형 표만.
4. mimetype을 STORED·첫 엔트리에서 누락 → 한글이 파일 인식 실패.
5. content.hpf/container.rdf/secCnt가 실제 패키지 구성과 어긋나게 만들기
   → 한글이 "손상된 파일"로 판정.

## 참고 파일

- `templates/<id>/template.json` — 서식별 역할→스타일 ID 맵·번호매김 설정
- `templates/<id>/` — 서식별 정품 스타일 백본(header.xml 등)
- `src/templates.js` — 템플릿 로더 / `src/parser.js` — 마크다운 파서(서식별 번호매김)
- `src/generate.js` — section0.xml 생성 + HWPX 조립 / `tools/extract_template.py` — 새 서식 추출
