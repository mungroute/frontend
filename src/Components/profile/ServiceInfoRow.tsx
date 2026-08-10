import '../../styles/components/profile-controls.css'

type ServiceInfoRowProps = {
  title: string
  description?: string
  onClick?: () => void
}

export function ServiceInfoRow({ title, description, onClick }: ServiceInfoRowProps) {
  const content = <><span><strong>{title}</strong>{description && <small>{description}</small>}</span>{onClick && <span aria-hidden="true">›</span>}</>

  if (!onClick) {
    return <div className="service-info-row">{content}</div>
  }

  return (
    <button className="service-info-row" type="button" onClick={onClick}>
      {content}
    </button>
  )
}
