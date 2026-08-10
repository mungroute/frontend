import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import '../../styles/components/auth-shell.css'

type AuthShellProps = {
  title: string
  description: string
  variant: 'login' | 'signup'
  children: ReactNode
  footer: ReactNode
  onBack?: () => void
}

export function AuthShell({ title, description, variant, children, footer, onBack }: AuthShellProps) {
  return (
    <main className={`auth-page auth-page--${variant}`}>
      {onBack && (
        <button className="auth-page__back" type="button" aria-label="뒤로 가기" onClick={onBack}>
          <ArrowLeft size={26} aria-hidden="true" />
        </button>
      )}
      <header className="auth-page__header">
        <img src="/assets/brand/logo-stacked@2x.png" alt="멍루트" />
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <section className="auth-page__content">{children}</section>
      <footer className="auth-page__footer">{footer}</footer>
    </main>
  )
}
