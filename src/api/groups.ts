import type { CourseDetail, CourseSource } from './courses'
import { apiRequest } from './http'

export type GroupRole = 'OWNER' | 'MEMBER'
export type GroupVisibility = 'PUBLIC' | 'PRIVATE'
export type GroupJoinPolicy = 'OPEN' | 'INVITE_ONLY'

export type GroupSummary = {
  groupId: number
  name: string
  description: string
  visibility: GroupVisibility
  joinPolicy: GroupJoinPolicy
  myRole: GroupRole | null
  memberCount: number
  sharedCourseCount: number
  latestActivityAt: string | null
  createdAt: string
}

export type GroupMember = {
  userId: number
  nickname: string
  profileImageUrl: string | null
  role: GroupRole
  joinedAt: string
}

export type GroupSharedCourse = {
  sharedCourseId: number
  groupId: number
  sharedByUserId: number
  sharerNickname: string
  saveCount: number
  sharedAt: string
  course: CourseDetail
}

export type GroupDetail = Omit<GroupSummary, 'myRole'> & {
  myRole: GroupRole
  members: GroupMember[]
  recentCourses: GroupSharedCourse[]
}

export type GroupInvite = {
  groupId: number
  groupName: string
  inviteCode: string
  expiresAt: string
}

export type GroupActivity = {
  activityId: number
  actorUserId: number | null
  actorNickname: string
  actorProfileImageUrl: string | null
  activityType: string
  subject: string | null
  message: string
  createdAt: string
}

export type SavedSharedCourse = {
  sharedCourseId: number
  courseSource: 'custom'
  courseId: number
}

export type GroupApi = {
  list(): Promise<GroupSummary[]>
  discover(): Promise<GroupSummary[]>
  create(input: { name: string; description: string; visibility: GroupVisibility; joinPolicy: GroupJoinPolicy }): Promise<GroupDetail>
  join(inviteCode: string): Promise<GroupDetail>
  joinOpen(groupId: number): Promise<GroupDetail>
  detail(groupId: number): Promise<GroupDetail>
  update(groupId: number, input: { name: string; description: string; visibility: GroupVisibility; joinPolicy: GroupJoinPolicy }): Promise<GroupDetail>
  delete(groupId: number): Promise<void>
  leave(groupId: number): Promise<void>
  removeMember(groupId: number, userId: number): Promise<void>
  currentInvite(groupId: number): Promise<GroupInvite>
  issueInvite(groupId: number): Promise<GroupInvite>
  courses(groupId: number, sort?: 'latest' | 'shortest' | 'shade'): Promise<GroupSharedCourse[]>
  sharedCourse(groupId: number, sharedCourseId: number): Promise<GroupSharedCourse>
  shareCourse(groupId: number, courseSource: CourseSource, courseId: number): Promise<GroupSharedCourse>
  unshareCourse(groupId: number, sharedCourseId: number): Promise<void>
  saveSharedCourse(groupId: number, sharedCourseId: number): Promise<SavedSharedCourse>
  activities(groupId: number, before?: number): Promise<GroupActivity[]>
}

const atCurrentTime = (path: string) => {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}requestedAt=${encodeURIComponent(new Date().toISOString())}`
}

export const groupApi: GroupApi = {
  list: () => apiRequest<GroupSummary[]>('/api/groups'),
  discover: () => apiRequest<GroupSummary[]>('/api/groups/discover'),
  create: (input) => apiRequest<GroupDetail>(atCurrentTime('/api/groups'), {
    method: 'POST', body: JSON.stringify(input),
  }),
  join: (inviteCode) => apiRequest<GroupDetail>(atCurrentTime('/api/groups/join'), {
    method: 'POST', body: JSON.stringify({ inviteCode }),
  }),
  joinOpen: (groupId) => apiRequest<GroupDetail>(atCurrentTime(`/api/groups/${groupId}/join`), {
    method: 'POST',
  }),
  detail: (groupId) => apiRequest<GroupDetail>(atCurrentTime(`/api/groups/${groupId}`)),
  update: (groupId, input) => apiRequest<GroupDetail>(atCurrentTime(`/api/groups/${groupId}`), {
    method: 'PATCH', body: JSON.stringify(input),
  }),
  delete: (groupId) => apiRequest<void>(`/api/groups/${groupId}`, { method: 'DELETE' }),
  leave: (groupId) => apiRequest<void>(`/api/groups/${groupId}/leave`, { method: 'POST' }),
  removeMember: (groupId, userId) => apiRequest<void>(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
  currentInvite: (groupId) => apiRequest<GroupInvite>(`/api/groups/${groupId}/invite-code`),
  issueInvite: (groupId) => apiRequest<GroupInvite>(`/api/groups/${groupId}/invite-code`, { method: 'POST' }),
  courses: (groupId, sort = 'latest') => apiRequest<GroupSharedCourse[]>(
    atCurrentTime(`/api/groups/${groupId}/courses?sort=${sort}&size=100`),
  ),
  sharedCourse: (groupId, sharedCourseId) => apiRequest<GroupSharedCourse>(
    atCurrentTime(`/api/groups/${groupId}/courses/${sharedCourseId}`),
  ),
  shareCourse: (groupId, courseSource, courseId) => apiRequest<GroupSharedCourse>(
    atCurrentTime(`/api/groups/${groupId}/courses`),
    { method: 'POST', body: JSON.stringify({ courseSource, courseId }) },
  ),
  unshareCourse: (groupId, sharedCourseId) => apiRequest<void>(
    `/api/groups/${groupId}/courses/${sharedCourseId}`, { method: 'DELETE' },
  ),
  saveSharedCourse: (groupId, sharedCourseId) => apiRequest<SavedSharedCourse>(
    `/api/groups/${groupId}/courses/${sharedCourseId}/save`, { method: 'POST' },
  ),
  activities: (groupId, before) => apiRequest<GroupActivity[]>(
    `/api/groups/${groupId}/activities?size=50${before ? `&before=${before}` : ''}`,
  ),
}
