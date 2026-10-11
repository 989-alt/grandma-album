// 닫는 장면(PRD §3 6장 아래). 오빠와의 이산 상태로 갈린다. 둘째 줄 = 교과서 ㊸(p.152) 이산가족 찾기 방송.
export type ClosingKey = 'brother-with' | 'brother-apart';

const BROADCAST = '1983년 이산가족 찾기 생방송이 138일 동안 이어졌고, 만 명이 넘는 사람이 가족을 다시 만났단다.';

export const CLOSING: { variants: Record<ClosingKey, [string, string]> } = {
  variants: {
    'brother-with': ['오빠는 돌아왔지만, 흥남 부두에서 손을 놓친 아버지는 다시 만나지 못했단다.', BROADCAST],
    'brother-apart': ['아버지도 오빠도 다시 만나지 못해, 이 사진첩엔 빈 액자 둘이 남았단다.', BROADCAST],
  },
};
