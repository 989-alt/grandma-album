// 낱말 주머니. 뜻은 교과분석.md 에 적힌 교과서 풀이만(풀이가 없는 용어는 뺐다). source = 지도 내용 번호.
import type { Term } from '../types';

export const TERMS: Term[] = [
  { word: '통상', meaning: '외국과 서로 물건을 사고파는 것.', source: [1, 10] },
  { word: '개항', meaning: '항구를 열어 외국 배가 드나들도록 허가하는 것.', source: [2, 10] },
  { word: '강화도 조약', meaning: '조선이 외국과 맺은 최초의 근대적 조약이지만, 불평등 조약이었다.', source: [2] },
  { word: '소학교', meaning: '오늘날의 초등학교.', source: [5, 10] },
  { word: '전신', meaning: '문자나 숫자를 전기 신호로 주고받는 통신 수단.', source: [6, 10] },
  { word: '양행', meaning: '서양 물건을 파는 가게.', source: [8, 10] },
  { word: '일제', meaning: "'일본 제국'을 줄여 이르는 말.", source: [11] },
  { word: '을사늑약', meaning: '일제가 억지로 맺은 조약. 대한 제국은 이 조약으로 외교권을 빼앗겼다.', source: [11] },
  { word: '헌병', meaning: '군대에서 경찰 역할을 하는 군인.', source: [14] },
  { word: '보통학교', meaning: '일제가 만든 초등 교육 기관.', source: [14] },
  { word: '토막집', meaning: '땅을 파고 나무토막·흙·짚으로 지은 집.', source: [24] },
  { word: '몸뻬', meaning: '통이 넓은 일본식 바지. 여성에게 치마 대신 입도록 강요했다.', source: [27] },
  { word: '광복', meaning: '빼앗겼던 나라를 다시 찾음.', source: [30, 45] },
  { word: '제2차 세계 대전', meaning: '1939년부터 1945년까지 벌어진 세계 전쟁. 연합국이 승리했다.', source: [30, 45] },
  { word: '제헌 국회', meaning: '헌법을 만든 제1대 국회.', source: [34, 45] },
  { word: '정전', meaning: '전쟁 당사자들이 합의해 전투를 잠시 멈추는 것.', source: [37, 45] },
  { word: '휴전선', meaning: '정전 협정 때 남과 북이 차지한 지역을 경계로 생긴 선.', source: [37, 45] },
  { word: '천막 학교', meaning: '6·25 전쟁 때 학생들이 배움을 이어 간 천막 교실.', source: [38, 45] },
  { word: '이산가족', meaning: '피란 중 가족과 헤어져 만나지 못한 사람들.', source: [43, 45] },
  { word: '전쟁고아', meaning: '전쟁으로 부모를 잃은 아이.', source: [43, 45] },
];
