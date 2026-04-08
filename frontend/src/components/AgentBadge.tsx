interface Props {
  agent: 'claude' | 'openai' | 'codex' | 'system' | 'user'
  size?: 'sm' | 'md'
}

const CONFIG = {
  claude: { label: 'Claude', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: '◆' },
  openai: { label: 'GPT-4', color: '#34d399', bg: 'rgba(52,211,153,0.12)', icon: '●' },
  codex: { label: 'Codex', color: '#34d399', bg: 'rgba(52,211,153,0.12)', icon: '⬡' },
  system: { label: 'System', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: '⬡' },
  user: { label: 'You', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', icon: '◉' },
}

export function AgentBadge({ agent, size = 'sm' }: Props) {
  const c = CONFIG[agent] ?? CONFIG.system
  const pad = size === 'md' ? '4px 10px' : '2px 7px'
  const fs = size === 'md' ? '12px' : '11px'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: pad,
        borderRadius: '99px',
        background: c.bg,
        border: `1px solid ${c.color}33`,
        color: c.color,
        fontSize: fs,
        fontWeight: 600,
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: size === 'md' ? '10px' : '8px' }}>{c.icon}</span>
      {c.label}
    </span>
  )
}
