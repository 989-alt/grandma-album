# 할머니의 사진첩

초등 5학년 2학기 사회 3단원 「식민 통치와 저항, 전쟁이 바꾼 사회와 생활」(+ 2단원 개항)을 마무리하는 스토리텔링 게임입니다. 할머니가 손주에게 사진첩을 넘기며 들려주는 3세대 이야기 30장면을 살고, 사진 뒷면에 교과서 「꼭! 기억해요」 한 줄을 새깁니다.

- 성취기준: [6사05-02] [6사06-01] [6사06-02]
- 대상: 태블릿 가로(1024×768) 혼자 30~35분, 장마다 자동 저장
- 개인정보·네트워크 호출 없음. HTML 파일 하나로 돕니다.

## 실행

배포본: https://989-alt.github.io/grandma-album/

로컬:

```
npm install
npm run build        # dist/index.html 하나
npm run preview
```

테스트: `npm run typecheck && npx vitest run && npx playwright test`

## 만든 방식

- 그림·UI 킷: GPT 이미지 생성(프롬프트는 `assets/prompts/`)
- 배경음: Suno, 효과음: Suno sounds (kie.ai)
- 서체: Gowun Batang, Gowun Dodum, Nanum Pen Script (SIL OFL 1.1, `assets/fonts/`)
- 코드: Vite + TypeScript + Preact
