# hwpx-pyeonram

정부·공공기관 서식 그대로 HWPX(한글) 문서를 만드는 CLI · 라이브러리입니다.
마크다운/텍스트만 넣으면 선택한 서식의 폰트·아웃라인·표 디자인이 적용된 `.hwpx`가 나옵니다.

```bash
npx hwpx-pyeonram 보고서.md -o 보고서.hwpx            # 기본: 행정업무운영 편람 서식
npx hwpx-pyeonram 보고서.md -t bogo -o 보고서.hwpx    # 부처 업무보고 서식
```

## 지원 서식

| id | 서식 | 어울리는 문서 |
| --- | --- | --- |
| `pyeonram` | 행정업무운영 편람 (기본) | 공식 편람·매뉴얼, 제N장/제N절 장문 보고서 |
| `bogo` | 부처 업무보고 | 정부 업무보고·정책 보고 자료 (Ⅰ. / □ / ㅇ) |
| `jichim` | 실행지침·실무 가이드 | 내부 지침, 실무 가이드, 원칙 문서 |
| `lecture` | 강의계획서·교육과정 | 교육과정 개요, 강의·훈련 계획 |
| `opinion` | 자문의견서·심사 양식 | 위원회 의견서, 심사·평가 양식 |
| `proposal` | 교육 제안서 | 교육·사업 제안서, 과정 소개 |
| `gongmo` | 공모·포상 계획안 | 공모 계획안, 포상·추천 공고 |

각 서식은 정품 원본 HWPX에서 추출한 `header.xml` 스타일 백본을 그대로 사용하므로
한글에서 열었을 때 원본과 동일한 디자인으로 보입니다. 목록 확인: `npx hwpx-pyeonram --list`

설치 없이 `npx` 한 줄로 실행됩니다. (Node.js 14+ 필요)

### GitHub에서 바로 실행 (npm 게시 없이도 가능)

npm 레지스트리에 올리지 않아도, GitHub 저장소만으로 `npx` 실행이 됩니다.

```bash
# 셋 다 동일하게 동작
npx github:cdsassj00/hwpx-pyeonram 보고서.md -o 보고서.hwpx
npx cdsassj00/hwpx-pyeonram 보고서.md -o 보고서.hwpx
npx https://github.com/cdsassj00/hwpx-pyeonram 보고서.md -o 보고서.hwpx

# 특정 브랜치/태그 지정
npx github:cdsassj00/hwpx-pyeonram#v1.0.0 보고서.md -o 보고서.hwpx
```

> `npx`는 GitHub 패키지를 캐시합니다. 예전에 실행한 적이 있는 PC에서 최신 버전이 안 잡히면
> `npx clear-npx-cache` 후 다시 실행하세요.

### Claude Code 스킬로 설치

이 저장소는 그 자체로 Claude Code 스킬입니다(`SKILL.md` + 실행 코드 동봉).
스킬 폴더에 클론만 하면 끝납니다.

```bash
# 전역 설치 (모든 프로젝트에서 사용)
git clone https://github.com/cdsassj00/hwpx-pyeonram.git ~/.claude/skills/hwpx-pyeonram
# Windows PowerShell
git clone https://github.com/cdsassj00/hwpx-pyeonram.git $env:USERPROFILE\.claude\skills\hwpx-pyeonram
```

설치 후 Claude Code에서 "업무보고 서식으로 hwpx 만들어줘"처럼 요청하면
서식 선택부터 생성까지 스킬이 처리합니다. 업데이트는 해당 폴더에서 `git pull` 한 번이면 됩니다.
(Node.js 14+ 필요)

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
npx hwpx-pyeonram <입력.md> [-o 출력.hwpx] [-t 서식] [옵션]

  -o, --out <파일>       출력 경로 (기본: 입력파일명.hwpx)
  -t, --template <서식>  적용할 서식 id (기본: pyeonram, 목록은 --list)
      --list             사용 가능한 서식 목록
      --stdin            표준입력에서 읽기
      --no-autonum       자동 번호매김·항목기호 끄기
  -h, --help             도움말
  -v, --version          버전
```

`-t` 없이 터미널에서 실행하면 서식을 번호로 고르는 대화형 프롬프트가 뜹니다.

```bash
# 파일 입력 + 서식 지정
npx hwpx-pyeonram report.md -t jichim -o report.hwpx

# 파이프 입력 (서식 미지정 시 pyeonram)
cat report.md | npx hwpx-pyeonram --stdin -t lecture -o report.hwpx
```

---

## 라이브러리 API

```js
const { generateHwpx, parse } = require('hwpx-pyeonram');
const fs = require('fs');

// 마크다운 → HWPX 버퍼 (template 미지정 시 pyeonram)
const buf = generateHwpx('# 개요\n본문입니다.', { template: 'bogo', autonum: true });
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

## 새 서식 추가

원본 `.hwpx` 한 개만 있으면 서식을 계속 늘릴 수 있습니다.

```bash
python tools/extract_template.py 원본.hwpx templates/새서식아이디
# templates/새서식아이디/template.json 의 role/borderFill/numbering 을 채운 뒤
node test/smoke.js
```

---

## 호환성 메모

- 폰트는 임베딩하지 않으므로, KoPub 폰트가 없는 PC에서는 한글이 유사 글꼴로 대체 표시합니다.
  (KoPub 폰트는 무료 배포되며 대부분의 공공기관 PC에 설치되어 있습니다.)
- 셀 병합은 사용하지 않습니다(가이드라인 준수). 단순 직사각형 표만 생성합니다.

## 라이선스

MIT. 본 도구는 공개된 편람의 **서식(스타일)** 만을 재사용하며, 원본 편람의 본문 콘텐츠는 포함하지 않습니다.
