import { UsersRound } from 'lucide-react'
import '../../styles/components/home-controls.css'

const homeAsset = (name: string) => `/assets/s01/${name}`

type NavigationKey = 'home' | 'courses' | 'groups' | 'records' | 'profile'

const navigationItems: Array<{ key: NavigationKey; label: string; href: string; icon: string; activeIcon?: string }> = [
  { key: 'home', label: '홈', href: '/home', icon: '/assets/c01/nav-home.svg', activeIcon: '/assets/s01/nav-home.svg' },
  { key: 'courses', label: '코스', href: '/courses', icon: '/assets/s01/nav-courses.svg', activeIcon: '/assets/c01/nav-courses-active.svg' },
  { key: 'groups', label: '그룹', href: '/groups', icon: '' },
  { key: 'records', label: '기록', href: '/records', icon: '/assets/s01/nav-records.svg', activeIcon: '/assets/r01/nav-records-active.svg' },
  { key: 'profile', label: '마이', href: '/profile', icon: '/assets/s01/nav-profile.svg', activeIcon: '/assets/my01/nav-profile-active.svg' },
]

export function HomeBottomNavigation({ active = 'home' }: { active?: NavigationKey }) {
  return (
    <nav className="home-bottom-navigation" aria-label="주요 메뉴">
      {navigationItems.map((item) => {
        const isActive = item.key === active
        return (
          <a
            className={`home-bottom-navigation__item${isActive ? ' home-bottom-navigation__item--active' : ''}`}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            key={item.label}
          >
            {item.key === 'groups'
              ? <UsersRound size={22} strokeWidth={2} aria-hidden="true" />
              : <img src={isActive && item.activeIcon ? item.activeIcon : item.icon} alt="" />}
            <span>{item.label}</span>
            {isActive && <span className="home-bottom-navigation__active-dot" aria-hidden="true" />}
          </a>
        )
      })}
    </nav>
  )
}

type HomeWalkStartActionProps = {
  className?: string
  onClick?: () => void
}

export function HomeWalkStartAction({ className = '', onClick }: HomeWalkStartActionProps) {
  return (
    <button className={`home-walk-start-action ${className}`.trim()} type="button" onClick={onClick}>
      <span className="home-walk-start-action__circle" aria-hidden="true">
        <img src={homeAsset('play.svg')} alt="" />
      </span>
      <span>산책 시작</span>
    </button>
  )
}
