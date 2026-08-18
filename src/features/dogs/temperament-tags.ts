export const DOG_TEMPERAMENT_TAGS = [
  '사람을 좋아해요',
  '강아지를 좋아해요',
  '차분해요',
  '활발해요',
  '낯가려요',
  '겁이 많아요',
  '예민해요',
  '물어요',
  '만지는 걸 싫어해요',
  '큰 개를 무서워해요',
] as const

export const MAX_DOG_TEMPERAMENT_TAGS = 5

export const formatDogTag = (tag: string) => `#${tag.replace(/^#/, '')}`
