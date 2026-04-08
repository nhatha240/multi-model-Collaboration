import ReactMarkdown from 'react-markdown'
import { AgentBadge } from './AgentBadge'
import type { LiveMessage } from '../types'

interface Props {
  msg: LiveMessage
}

const AGENT_COLORS = {
  claude: '#a78bfa',
  openai: '#34d399',
  codex: '#34d399',
  system: '#6b7280',
  user: '#60a5fa',
}

export function MessageBubble({ msg }: Props) {
  const color = AGENT_COLORS[msg.agent] ?? '#6b7280'
  const isThinking = msg.type === 'thinking'
  const isDelegation = msg.type === 'delegation'
  const isUser = msg.agent === 'user'

  if (isThinking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', opacity: 0.5 }}>
        <span style={{ color, fontSize: '12px' }}>◆</span>
        <span style={{ color: '#6b7280', fontSize: '13px', fontStyle: 'italic' }}>{msg.content}</span>
        <span style={{ color, animation: 'pulse 1s infinite' }}>···</span>
      </div>
    )
  }

  if (isDelegation) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '8px 12px',
          background: 'rgba(167,139,250,0.06)',
          border: '1px dashed rgba(167,139,250,0.2)',
          borderRadius: '8px',
          margin: '4px 0',
        }}
      >
        <span style={{ fontSize: '14px', marginTop: '1px' }}>⟶</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>
            DELEGATION
          </span>
          <div style={{ color: '#c4b5fd', fontSize: '13px', marginTop: '2px' }}>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: '10px',
        margin: '8px 0',
      }}
    >
      {/* Avatar dot */}
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: `${color}22`,
          border: `1.5px solid ${color}55`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        <span style={{ fontSize: '10px', color }}>
          {msg.agent === 'user' ? '◉' : msg.agent === 'claude' ? '◆' : msg.agent === 'codex' ? '⬡' : '●'}
        </span>
      </div>

      <div style={{ maxWidth: '80%', minWidth: '60px' }}>
        <div style={{ marginBottom: '4px' }}>
          <AgentBadge agent={msg.agent} size="sm" />
        </div>

        <div
          style={{
            background: isUser ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isUser ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: isUser ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
            padding: '10px 14px',
            color: '#e5e7eb',
            fontSize: '14px',
            lineHeight: '1.6',
          }}
        >
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const isBlock = className?.includes('language-')
                return isBlock ? (
                  <pre
                    style={{
                      background: '#0d0d10',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '6px',
                      padding: '12px',
                      overflowX: 'auto',
                      margin: '8px 0',
                    }}
                  >
                    <code
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                        color: '#c4b5fd',
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '12px',
                      background: 'rgba(255,255,255,0.08)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      color: '#a78bfa',
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                )
              },
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
