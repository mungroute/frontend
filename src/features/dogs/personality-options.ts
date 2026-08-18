export type DogGender = 'MALE' | 'FEMALE' | 'UNKNOWN'
export type LeashGreeting = 'LIKES' | 'NEUTRAL' | 'DIFFICULT' | 'UNKNOWN'
export type StrangerResponse = 'LIKES' | 'NEUTRAL' | 'DIFFICULT' | 'UNKNOWN'
export type TouchTolerance = 'COMFORTABLE' | 'CONDITIONAL' | 'DIFFICULT' | 'UNKNOWN'
export type BarkingLevel = 'RARE' | 'NORMAL' | 'FREQUENT' | 'UNKNOWN'
export type BitingLevel = 'NONE' | 'CONDITIONAL' | 'PRESENT' | 'UNKNOWN'

export type DogPersonalityValue = {
  leashGreeting: LeashGreeting
  strangerResponse: StrangerResponse
  touchTolerance: TouchTolerance
  barkingLevel: BarkingLevel
  bitingLevel: BitingLevel
}

export const DOG_PERSONALITY_ITEMS = [
  { key: 'leashGreeting', label: '목줄 인사', description: '산책 중 다른 강아지와 인사할 때', options: [
    { value: 'LIKES', label: '좋아해요' }, { value: 'NEUTRAL', label: '상황에 따라' }, { value: 'DIFFICULT', label: '어려워해요' },
  ] },
  { key: 'strangerResponse', label: '낯선 사람', description: '처음 보는 사람을 만났을 때', options: [
    { value: 'LIKES', label: '좋아해요' }, { value: 'NEUTRAL', label: '보통이에요' }, { value: 'DIFFICULT', label: '어려워해요' },
  ] },
  { key: 'touchTolerance', label: '스킨십', description: '다른 사람이 만지려고 할 때', options: [
    { value: 'COMFORTABLE', label: '가능해요' }, { value: 'CONDITIONAL', label: '상황에 따라' }, { value: 'DIFFICULT', label: '어려워요' },
  ] },
  { key: 'barkingLevel', label: '짖음 정도', description: '산책이나 만남 중 평소 짖는 정도', options: [
    { value: 'RARE', label: '거의 안 짖어요' }, { value: 'NORMAL', label: '보통이에요' }, { value: 'FREQUENT', label: '많이 짖어요' },
  ] },
  { key: 'bitingLevel', label: '입질 반응', description: '불편하거나 긴장했을 때 입질 여부', options: [
    { value: 'NONE', label: '없어요' }, { value: 'CONDITIONAL', label: '상황에 따라' }, { value: 'PRESENT', label: '있어요' },
  ] },
] as const
