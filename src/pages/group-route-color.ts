const GROUP_ROUTE_COLORS = [
  '#f47a3a', '#20a88f', '#5f82c5', '#9b6fc3', '#d96f8c',
  '#c5902f', '#5e9a68', '#d65e55', '#467f96', '#b87945',
]

export const groupRouteColorForUser = (userId: number) => {
  let hash = Math.imul(userId, 0x45d9f3b)
  hash = Math.imul((hash >>> 16) ^ hash, 0x45d9f3b)
  hash = (hash >>> 16) ^ hash
  return GROUP_ROUTE_COLORS[(hash >>> 0) % GROUP_ROUTE_COLORS.length]
}
