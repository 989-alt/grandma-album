// PRD §3 장면표 30장면. 내레이션은 PRD 표의 따옴표 문장 글자 그대로(교과서 문장).
// source = 지도 내용 번호(교과분석.md ①~㊺), back.source = 교과서 쪽수(5-5 만 지도서 쪽).
import type { Chapter, Choice, FamilyMember, FamilyStatus, Flags, Scene, Spot } from '../types';

// types.ts 에 없는 필드는 여기서만 좁게 넓힌다(보고서 "타입 확장 필요").
export type ChoiceData = Choice & { risk?: true };
export type BackData =
  | { type: 'initial'; prompt: string; answer: string; hint: string; keys: string[]; source: number[] }
  | { type: 'ox'; prompt: string; answer: boolean; fix: string; source: number[] };
export type SceneData = Omit<Scene, 'choices' | 'bundle' | 'compare' | 'letter' | 'back'> & {
  choices?: ChoiceData[];
  autoFlag?: keyof Flags;
  event?: { setFamily: { id: string; status: FamilyStatus } };
  bundle?: { candidates: string[]; slots: 3; requiresFlag: Record<string, keyof Flags> };
  compare?: { a: string; b: string; spots: Spot[]; graph?: { years: number[]; tenant: number[] } };
  letter?: { lines: string[]; moods: { id: string; text: string }[] };
  back: BackData;
};
export type ChapterData = Omit<Chapter, 'scenes'> & { scenes: SceneData[]; outro?: string };

const father: FamilyMember = { id: 'father', name: '아버지', role: '아버지' };
const mother: FamilyMember = { id: 'mother', name: '어머니', role: '어머니' };
const LATER: FamilyMember[] = [
  father,
  mother,
  { id: 'brother', name: '오빠', role: '오빠' },
  { id: 'okbun', name: '옥분', role: '나' },
  { id: 'little', name: '동생', role: '동생' },
];
const R = 0.09;

export const CHAPTERS: ChapterData[] = [
  {
    id: '1', title: '개항과 근대 문물', era: '1870~1890년대', protagonist: 'manbok',
    family: [father, mother], thirdAxis: 'new',
    outro: '이 놋수저가 우리 집에 온 게 그때란다.',
    scenes: [
      {
        id: '1-1', photoAsset: 'scene-1-1', source: [1, 10],
        narration: '서양 여러 나라의 배가 조선의 해안에 나타나 통상을 요구했단다. 조선은 처음에 거부했지.',
        dialogue: [
          '"저들이 바라는 건 백성에게 중요한 농산물이야. 교역하면 나라가 망해."',
          '"여러 나라와 통상하고 서양 문물을 받아들여야 발전하지."',
        ],
        choices: [
          { text: '농산물을 빼앗긴다는 어른 말에 고개를 끄덕인다', effects: { family: 0, home: 0, third: -1 } },
          { text: '새 문물을 받아야 발전한다는 어른 말에 고개를 끄덕인다', effects: { family: 0, home: 0, third: 1 } },
          { text: '놋수저 한 벌을 산다', effects: { family: 0, home: 0, third: 0 }, flag: 'spoon' },
        ],
        back: { type: 'ox', prompt: '조선은 처음에 서양 배의 통상 요구를 받아들였다', answer: false, fix: '조선은 처음에는 통상 요구를 거부했단다.', source: [104] },
      },
      {
        id: '1-2', photoAsset: 'scene-1-2', source: [2, 3],
        narration: '일본이 무력으로 통상을 요구하자 조선은 강화도에서 조약을 맺고 개항했단다(강화도 조약). 최초의 근대적 조약이었지만 불평등 조약이었어.',
        dialogue: ['항구에 외국 상인과 선교사가 내렸다.'],
        choices: [
          { text: '선교사가 준 물건을 받는다', effects: { family: 0, home: 0, third: 1 } },
          { text: '고개 숙여 사양한다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'initial', prompt: '조선은 일본과 ___을 맺고 개항했다. 최초의 근대적 조약이었지만 불평등 조약이었다.', answer: '강화도 조약', hint: 'ㄱㅎㄷ ㅈㅇ', keys: ['화', '각', '조', '강', '약', '호', '도'], source: [104] },
      },
      {
        id: '1-3', photoAsset: 'scene-1-3', source: [4, 5],
        narration: '소학교, 외국어 학교가 세워져 외국어·지리·체육을 배우게 됐단다.',
        dialogue: [],
        choices: [
          { text: '서당에 간다', effects: { family: 0, home: 0, third: 0 } },
          { text: '소학교에 간다', effects: { family: 0, home: -1, third: 1 } },
        ],
        compare: {
          a: 'compare-1-3-before', b: 'compare-1-3-after',
          spots: [
            { x: 0.35, y: 0.65, r: R, label: '양복 입은 사람' },
            { x: 0.8, y: 0.35, r: R, label: '서양식 벽돌 건물' },
            { x: 0.88, y: 0.15, r: R, label: '전봇대' },
          ],
        },
        back: { type: 'initial', prompt: '개항 이후 외국어 학교, ___, 기술 학교가 세워졌다.', answer: '소학교', hint: 'ㅅㅎㄱ', keys: ['학', '수', '교', '소', '고', '하'], source: [105] },
      },
      {
        id: '1-4', photoAsset: 'scene-1-4', source: [6, 7],
        narration: '전등을 쓰고, 전신과 전화로 소식을 빠르게 주고받게 됐지. 한성에 전차가 다니면서 생활 범위가 넓어졌단다.',
        dialogue: ['처음으로 전차를 탔다.', '"자리는 신분이 아니라 돈으로 가른단다."'],
        back: { type: 'ox', prompt: '전차의 앉는 자리는 신분에 따라 나뉘었다', answer: false, fix: '전차의 앉는 자리는 신분이 아니라 돈으로 나뉘었단다.', source: [106] },
      },
      {
        id: '1-5', photoAsset: 'scene-1-5', source: [8, 9],
        narration: '신문이 만들어져 나라 안팎의 소식을 접하게 됐단다. 가게에선 자전거·유성기를 광고했어.',
        dialogue: ['"가비차라는 서양 차도 있고, 인천에 온 중국인은 짜장면을 판대."'],
        choices: [
          { text: '신문을 읽어 드린다', effects: { family: 0, home: 0, third: 1 } },
          { text: '광고 그림만 구경한다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'initial', prompt: '___이 만들어져 나라 안팎의 소식과 다양한 생각을 접하게 되었다.', answer: '신문', hint: 'ㅅㅁ', keys: ['무', '신', '시', '문', '민', '사'], source: [107] },
      },
    ],
  },
  {
    id: '2', title: '일제의 침략과 저항', era: '1905~1920년대', protagonist: 'suni',
    family: [father, mother, { id: 'uncle', name: '삼촌', role: '삼촌' }], thirdAxis: 'language',
    outro: '어머니는 그 수저를 시집올 때 보자기에 싸 오셨단다.',
    scenes: [
      {
        id: '2-1', photoAsset: 'scene-2-1', source: [11, 12, 13],
        narration: '일제는 고종이 동의하지 않았는데도 을사늑약을 맺어 대한 제국의 외교권을 빼앗았단다. 고종은 헤이그에 특사를 보냈지만 일제의 방해로 실패했어.',
        dialogue: ['상인들은 가게 문을 닫고, 학생들은 학교에 가지 않았다.'],
        choices: [
          { text: '아버지 가게 문을 닫는다', effects: { family: 0, home: -1, third: 1 } },
          { text: '가게 문을 연다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'initial', prompt: '일제는 고종이 동의하지 않았는데도 ___을 맺어 대한 제국의 외교권을 빼앗았다.', answer: '을사늑약', hint: 'ㅇㅅㄴㅇ', keys: ['늑', '을', '약', '녹', '사', '의'], source: [122, 123] },
      },
      {
        id: '2-2', photoAsset: 'scene-2-2', source: [13],
        narration: '군대가 해산되자 군인들이 의병에 참여해 의병 운동이 활발해졌단다. 안중근은 하얼빈역에서 이토 히로부미를 처단했지.',
        dialogue: [],
        choices: [
          { text: '의병에게 주먹밥을 건넨다', effects: { family: 0, home: -1, third: 0 } },
          { text: '길을 비켜 준다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'ox', prompt: '대한 제국 군대가 해산되자 의병 운동은 움츠러들었다', answer: false, fix: '군대가 해산되자 군인들이 의병에 참여해 의병 운동이 활발해졌단다.', source: [124] },
      },
      {
        id: '2-3', photoAsset: 'scene-2-3', source: [14],
        narration: "1910년 나라를 빼앗겼단다. 조선 총독부가 세워지고 헌병이 경찰 노릇을 했어. 선생님도 제복에 칼을 찼지. '국어' 교과서는 일본어였단다.",
        dialogue: [],
        choices: [
          { text: '집에서 한글을 읽는다', effects: { family: 0, home: 0, third: 1 } },
          { text: '학교 숙제만 한다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'initial', prompt: '1910년 나라를 빼앗긴 뒤 일제는 ___를 세웠다.', answer: '조선 총독부', hint: 'ㅈㅅ ㅊㄷㅂ', keys: ['총', '지', '선', '부', '조', '배', '독'], source: [125] },
      },
      {
        id: '2-4', photoAsset: 'scene-2-4', source: [15, 16],
        narration: '토지 조사 사업으로 농민들은 땅을 잃거나 불리한 조건으로 계약해야 했단다.',
        dialogue: ['삼촌이 만주 신흥 무관 학교로 떠났다.', '"이은숙이라는 분은 옷을 지어 번 돈을 독립군에 보냈단다."'],
        event: { setFamily: { id: 'uncle', status: 'apart' } },
        compare: {
          a: 'graph-1916', b: 'graph-1932',
          spots: [
            { x: 0.75, y: 0.45, r: R, label: '빌린 땅 농민이 늘었다' },
            { x: 0.25, y: 0.65, r: R, label: '자기 땅 농민이 줄었다' },
          ],
          graph: { years: [1916, 1924, 1932], tenant: [36.8, 42.2, 54.8] },
        },
        back: { type: 'ox', prompt: '토지 조사 사업으로 농민들의 땅이 늘어났다', answer: false, fix: '토지 조사 사업으로 농민들은 땅을 잃거나 불리한 조건으로 계약해야 했단다.', source: [126] },
      },
      {
        id: '2-5', photoAsset: 'scene-2-5', source: [17, 18],
        narration: '1919년 3월 1일 독립 선언서가 발표되고 만세 시위가 전국으로 퍼졌단다(3·1 운동). 그해 상하이에 대한민국 임시 정부가 세워졌지.',
        dialogue: ['"탑골 공원에서 독립 선언서를 읽었대."', '"만세를 부른 어린 학생이 학교에서 쫓겨났대."'],
        choices: [
          { text: '태극기를 장독 뒤에 숨긴다', effects: { family: 0, home: 0, third: 0 } },
          { text: '태극기를 이불 속에 숨긴다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'initial', prompt: '1919년 상하이에 ___가 세워졌다.', answer: '대한민국 임시 정부', hint: 'ㄷㅎㅁㄱ ㅇㅅ ㅈㅂ', keys: ['국', '시', '동', '대', '부', '민', '임', '문', '한', '정'], source: [129, 130] },
      },
      {
        id: '2-6', photoAsset: 'scene-2-6', source: [19, 20, 21, 22],
        narration: '일제는 쌀을 더 많이 가져갔고 살림은 어려워졌단다. 그래도 물산 장려 운동, 농촌 계몽 운동, 조선어 학회의 사전 만들기가 이어졌지. 학생들은 6·10 만세 운동, 광주 학생 항일 운동을 일으켰고, 봉오동·청산리에서 독립군이 이겼단다.',
        dialogue: ['학생 선생님이 사랑방에서 한글을 가르쳐 주었다.'],
        choices: [
          { text: '우리 광목을 산다', effects: { family: 0, home: 0, third: 1 } },
          { text: '싼 일본 옷감을 산다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'initial', prompt: "'우리가 만든 것 우리가 쓰자'며 ___이 일어났다.", answer: '물산 장려 운동', hint: 'ㅁㅅ ㅈㄹ ㅇㄷ', keys: ['장', '무', '동', '산', '려', '운', '도', '물'], source: [131] },
      },
    ],
  },
  {
    id: '3', title: '일제 통치 시기 생활', era: '1938~1945', protagonist: 'okbun',
    family: LATER, thirdAxis: 'language',
    outro: '그러고 몇 달 뒤였단다.',
    scenes: [
      {
        id: '3-1', photoAsset: 'scene-3-1', source: [23],
        narration: '일제는 철도를 놓았지만 군대를 옮기고 빼앗은 쌀과 자원을 일본으로 실어 나르는 데 썼단다.',
        dialogue: [],
        choices: [
          { text: '기차를 구경한다', effects: { family: 0, home: 0, third: 0 } },
          { text: '쌀가마 수레를 센다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'ox', prompt: '철도는 주로 우리나라의 자원을 일본으로 실어 나르는 데 쓰였다', answer: true, fix: '철도는 군대를 옮기고 빼앗은 쌀과 자원을 일본으로 실어 나르는 데 쓰였단다.', source: [134] },
      },
      {
        id: '3-2', photoAsset: 'scene-3-2', source: [24, 25],
        narration: '일본인이 사는 곳엔 백화점과 전기가, 한국인이 사는 곳엔 공동 우물과 토막집이 있었단다.',
        dialogue: ['냉면 배달 자전거가 지나갔다. 먹어 보지는 못했다.'],
        compare: {
          a: 'compare-3-2-before', b: 'compare-3-2-after',
          spots: [
            { x: 0.6, y: 0.3, r: R, label: '백화점' },
            { x: 0.88, y: 0.2, r: R, label: '전기 가로등' },
            { x: 0.92, y: 0.78, r: R, label: '수도꼭지' },
          ],
        },
        back: { type: 'initial', prompt: '한국인이 사는 변두리에는 땅을 파고 나무토막·흙·짚으로 지은 ___이 있었다.', answer: '토막집', hint: 'ㅌㅁㅈ', keys: ['막', '타', '집', '토', '자', '목'], source: [135] },
      },
      {
        id: '3-3', photoAsset: 'scene-3-3', source: [26],
        narration: '일제는 신사에 절하게 하고, 성과 이름을 일본식으로 바꾸도록 했단다. 안 바꾸면 입학도 배급도 어려웠어.',
        dialogue: [],
        // 문구는 확정 시안(2-세피아-gen.py CARDS) 그대로. 어느 쪽도 탓하지 않는다(M12) — setFamily 없음.
        choices: [
          { text: '어머니 손을 꼭 잡고, 새 이름을 적는다', effects: { family: 0, home: 0, third: 0 } },
          { text: '우리 이름 그대로 두고 돌아선다', effects: { family: 0, home: -1, third: 1 } },
          { text: '아버지가 아는 서기에게 미룬다', effects: { family: 0, home: 0, third: 0 }, lock: { stat: 'home', min: 2 } },
        ],
        back: { type: 'initial', prompt: '일제는 전국에 세운 ___에 강제로 절을 하게 했다.', answer: '신사', hint: 'ㅅㅅ', keys: ['신', '서', '사', '소', '수', '시'], source: [137] },
      },
      {
        id: '3-4', photoAsset: 'scene-3-4', source: [27],
        narration: '학교에선 우리말과 역사를 배우지 못했고 일본어만 써야 했단다. 몸뻬를 입고 군사 훈련을 받았지.',
        dialogue: [],
        choices: [
          { text: '집에서 우리말 노래를 부른다', effects: { family: 0, home: 0, third: 1 } },
          { text: '조용히 지낸다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'ox', prompt: '학교에서 우리말과 우리 역사를 배울 수 있었다', answer: false, fix: '학교에선 우리말과 역사를 배우지 못하고 일본어만 써야 했단다.', source: [137] },
      },
      {
        id: '3-5', photoAsset: 'scene-3-5', source: [28],
        narration: "일제는 전쟁에 필요한 사람과 물자를 강제로 동원했단다. 놋그릇·수저까지 빼앗아 갔지. 일부 여성들은 일본군 '위안부'로 끌려가 많은 고통을 겪었어.",
        dialogue: [],
        choices: [
          { text: '놋수저 한 벌을 숨긴다', effects: { family: 0, home: 0, third: 0 }, flag: 'spoon_hidden', risk: true },
          { text: '놋수저를 내놓는다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'initial', prompt: '일제는 ___과 수저까지 빼앗아 갔다.', answer: '놋그릇', hint: 'ㄴㄱㄹ', keys: ['그', '나', '릇', '놋', '르', '구'], source: [138] },
      },
      {
        id: '3-6', photoAsset: 'scene-3-6', source: [29],
        narration: '탄압 속에서도 우리 역사를 연구하고 저항하는 글을 썼단다. 임시 정부는 한국광복군을 만들어 일본과 싸울 준비를 했어.',
        dialogue: ['만주로 간 삼촌이 한국광복군에 있다는 편지가 왔다.'],
        choices: [
          { text: '편지를 다락에 숨긴다', effects: { family: 0, home: 0, third: 0 } },
          { text: '편지를 베갯속에 숨긴다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'initial', prompt: '임시 정부는 ___을 만들어 일본과 싸울 준비를 했다.', answer: '한국광복군', hint: 'ㅎㄱㄱㅂㄱ', keys: ['광', '공', '군', '한', '복', '부', '국'], source: [138] },
      },
    ],
  },
  {
    id: '4', title: '8·15 광복과 대한민국 정부 수립', era: '1945.8.16~1948', protagonist: 'okbun',
    family: LATER, thirdAxis: 'hope',
    scenes: [
      {
        id: '4-1', photoAsset: 'scene-4-1', source: [30, 31, 32],
        narration: '우리 민족의 끊임없는 노력과 연합국의 승리로 1945년 8월 15일 광복을 맞았단다. 15일은 조용했고 16일부터 거리가 만세로 가득 찼지.',
        dialogue: ['담임 선생님이 칠판에 원래 이름을 쓰고 불러 주었다.'],
        autoFlag: 'first_color',
        compare: {
          a: 'compare-4-1-before', b: 'compare-4-1-after',
          spots: [
            { x: 0.15, y: 0.3, r: R, label: '창밖에 색이 든 하늘' },
            { x: 0.6, y: 0.45, r: R, label: '선생님 손의 종이' },
            { x: 0.75, y: 0.5, r: R, label: '손을 든 아이들' },
          ],
        },
        back: { type: 'initial', prompt: '1945년 8월 15일, 우리 민족은 ___을 맞았다.', answer: '광복', hint: 'ㄱㅂ', keys: ['복', '공', '광', '보', '국', '반'], source: [141] },
      },
      {
        id: '4-2', photoAsset: 'scene-4-2', source: [31, 32],
        narration: '폐간됐던 한글 잡지와 신문이 다시 나왔단다. 감옥에 갇힌 독립운동가가 풀려나고 임시 정부 지도자들이 돌아왔지.',
        dialogue: ['삼촌이 돌아왔다.', '마루에서 어린이 신문을 읽었다.'],
        back: { type: 'ox', prompt: '광복 뒤에도 한글 신문은 발행되지 못했다', answer: false, fix: '광복 뒤 폐간됐던 한글 잡지와 신문이 다시 나왔단다.', source: [142] },
      },
      {
        id: '4-3', photoAsset: 'scene-4-3', source: [33],
        narration: '일본군 무장 해제를 이유로 38도선 남쪽엔 미군, 북쪽엔 소련군이 들어왔단다. 그때는 남북으로 오갈 수 있었어.',
        dialogue: ['38도선 너머 북쪽 외가에 다녀왔다.'],
        choices: [
          { text: '외가에 놋수저를 보여 드린다', effects: { family: 0, home: 0, third: 0 } },
          { text: '외가 마당에서 동생과 논다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'ox', prompt: '광복 직후 38도선은 넘을 수 없는 선이었다', answer: false, fix: '그땐 오갈 수 있었단다.', source: [143] },
      },
      {
        id: '4-4', photoAsset: 'scene-4-4', source: [34, 35],
        narration: '통일 정부를 세우려 했지만 뜻이 맞지 않아, 국제 연합의 결정으로 1948년 5월 10일 남한에서만 총선거를 했단다. 제헌 국회가 7월 17일 헌법을 만들고, 8월 15일 대한민국 정부가 세워졌지.',
        dialogue: ['어머니와 아버지가 투표하러 갔다. 옥분이도 따라갔다.', '"나라 이름 대한민국도 제헌 국회에서 투표로 정했대."'],
        back: { type: 'ox', prompt: '5·10 총선거는 남한과 북한이 동시에 실시했다', answer: false, fix: '5·10 총선거는 남한에서만 했단다.', source: [144] },
      },
    ],
  },
  {
    id: '5', title: '6·25 전쟁', era: '1950~1953', protagonist: 'okbun',
    family: LATER, thirdAxis: 'hope',
    scenes: [
      {
        id: '5-1', photoAsset: 'scene-5-1', source: [36],
        narration: '1950년 6월 25일 북한군이 38도선을 넘어 쳐들어왔단다. 사흘 만에 서울이 넘어가고 사람들은 피란길에 올랐지.',
        dialogue: [],
        bundle: { candidates: ['spoon', 'bundle', 'book', 'radish', 'photo', 'medicine'], slots: 3, requiresFlag: { spoon: 'spoon_hidden' } },
        back: { type: 'initial', prompt: '1950년 6월 25일 북한군이 38도선을 넘어 기습 ___을 했다.', answer: '남침', hint: 'ㄴㅊ', keys: ['침', '나', '남', '창', '천', '노'], source: [146] },
      },
      {
        id: '5-2', photoAsset: 'scene-5-2', source: [38],
        narration: '임시 수도 부산에 전국에서 피란민이 모였단다. 산등성이 움막에서 살고, 물 한 바가지 얻으려 줄을 섰지.',
        dialogue: [],
        choices: [
          { text: '물 줄에 선다', effects: { family: 0, home: 0, third: 0 } },
          { text: '일자리 줄에 선다', effects: { family: 0, home: 1, third: 0 } },
        ],
        back: { type: 'initial', prompt: '피란민들은 ___ 부산으로 모였다.', answer: '임시 수도', hint: 'ㅇㅅ ㅅㄷ', keys: ['수', '이', '임', '도', '사', '시'], source: [148] },
      },
      {
        id: '5-3', photoAsset: 'scene-5-3', source: [38, 40],
        narration: '학생들은 천막 학교에서 배움을 이어 갔단다. 북쪽에서 온 피란민은 냉면 대신 밀가루와 고구마 전분으로 밀면을 만들었지.',
        dialogue: [],
        back: { type: 'initial', prompt: '학생들은 ___에서 배움을 이어 갔다.', answer: '천막 학교', hint: 'ㅊㅁ ㅎㄱ', keys: ['막', '처', '교', '천', '학', '문'], source: [148] },
      },
      {
        id: '5-4', photoAsset: 'scene-5-4', source: [37],
        narration: '국제 연합군이 와서 인천 상륙 작전에 성공해 서울을 되찾고 압록강 가까이 갔단다. 사람들은 고향으로 돌아갔지.',
        dialogue: [],
        back: { type: 'initial', prompt: '국제 연합군이 ___에 성공해 서울을 되찾았다.', answer: '인천 상륙 작전', hint: 'ㅇㅊ ㅅㄹ ㅈㅈ', keys: ['상', '이', '전', '인', '륙', '장', '천', '작'], source: [146, 147] },
      },
      {
        id: '5-5', photoAsset: 'scene-5-5', source: [41],
        narration: '학생들도 전쟁에 나가기도 했단다.',
        dialogue: ['오빠가 학도병으로 떠났다.'],
        choices: [
          { text: '"꼭 살아서 돌아와."', effects: { family: 0, home: 0, third: 0 } },
          { text: '"편지 꼭 보내 줘."', effects: { family: 0, home: 0, third: 0 } },
        ],
        letter: {
          lines: [
            '어머니, 전쟁은 왜 해야 하나요?',
            '같은 언어와 같은 피를 나눈 동족이라고 생각하니 가슴이 답답하고 무겁습니다.',
            '우리는 겨우 71명입니다.',
            '죽음이 무서운 게 아니라, 어머님도 형제들도 못 만난다고 생각하니 무서워지는 것입니다.',
            '상추쌈이 먹고 싶습니다. 찬 옹달샘에서 이가 시리도록 차가운 냉수를 한없이 들이켜고 싶습니다.',
            '저는 꼭 살아서 다시 어머님 곁으로 가겠습니다.',
          ],
          moods: [
            { id: 'fear', text: '두렵다' },
            { id: 'kin', text: '동족과 싸우는 게 괴롭다' },
            { id: 'return', text: '꼭 살아서 돌아오겠다' },
          ],
        },
        back: { type: 'ox', prompt: '6·25 전쟁 때 학생들이 학도병으로 참여하기도 했다', answer: true, fix: '학생들도 학도병으로 전쟁에 나가기도 했단다.', source: [327, 328] },
      },
      {
        id: '5-6', photoAsset: 'scene-5-6', source: [37, 39],
        narration: '중국군이 참전해 서울을 다시 빼앗겼단다. 돌아갔던 사람들도 다시 피란을 떠났지. 흥남에서는 59명 타는 배에 만 사천 명이 탔단다.',
        dialogue: ['북쪽 외가에 갔던 아버지와 부두에서 손을 놓쳤다.'],
        event: { setFamily: { id: 'father', status: 'apart' } },
        back: { type: 'initial', prompt: '중국군이 참전한 뒤 ___으로 피란민 9만여 명이 배를 타고 남쪽으로 왔다.', answer: '흥남 철수 작전', hint: 'ㅎㄴ ㅊㅅ ㅈㅈ', keys: ['철', '한', '작', '흥', '수', '조', '남', '전'], source: [149] },
      },
      {
        id: '5-7', photoAsset: 'scene-5-7', source: [37],
        narration: '1953년 7월 정전 협정이 맺어졌단다. 전쟁이 끝난 게 아니라 멈춘 거야. 그때 남과 북이 차지한 곳을 경계로 휴전선이 생겼지.',
        dialogue: [],
        compare: {
          a: 'compare-5-7-before', b: 'compare-5-7-after',
          spots: [
            { x: 0.55, y: 0.5, r: R, label: '철조망' },
            { x: 0.88, y: 0.28, r: R, label: '감시탑' },
          ],
        },
        // PRD 원문은 주어 조사가 '이'라 금지 문구 검사(PRD §6-2)에 걸린다 → 조사만 '은'으로 바꿈. 보고서 참조.
        back: { type: 'ox', prompt: '1953년 7월에 6·25 전쟁은 끝났다', answer: false, fix: '끝난 게 아니라 멈춘 거란다. 정전 협정이야.', source: [147] },
      },
    ],
  },
  {
    id: '6', title: '전쟁 이후', era: '1953', protagonist: 'okbun',
    family: LATER, thirdAxis: 'hope',
    scenes: [
      {
        id: '6-1', photoAsset: 'scene-6-1', source: [42, 43],
        narration: '많은 사람이 죽거나 다치고, 집과 다리와 국가유산이 부서졌단다. 부모를 잃은 전쟁고아도 많았어.',
        dialogue: [],
        choices: [
          { text: '이웃 아이를 챙긴다', effects: { family: 0, home: -1, third: 1 } },
          { text: '우리 집부터 고친다', effects: { family: 0, home: 0, third: 0 } },
        ],
        back: { type: 'initial', prompt: '전쟁으로 부모를 잃은 ___도 많았다.', answer: '전쟁고아', hint: 'ㅈㅈㄱㅇ', keys: ['쟁', '정', '아', '전', '가', '고'], source: [152] },
      },
      {
        id: '6-2', photoAsset: 'scene-6-2', source: [43, 44],
        narration: '피란 중 헤어져 만나지 못한 이산가족이 많았단다. 남과 북은 서로를 적으로 여기게 됐고, 지금까지 나뉘어 있지.',
        dialogue: [],
        back: { type: 'initial', prompt: '피란 중 가족과 헤어져 만나지 못한 ___이 많았다.', answer: '이산가족', hint: 'ㅇㅅㄱㅈ', keys: ['산', '아', '족', '이', '사', '가'], source: [152] },
      },
    ],
  },
];
