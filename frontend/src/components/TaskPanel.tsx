import { useAppStore } from '../stores/appStore'
import type { Task } from '../types'

const STATUS_COLOR: Record<Task['status'], string> = {
  pending: '#6b7280',
  running: '#f59e0b',
  completed: '#34d399',
  failed: '#f87171',
}

const STATUS_ICON: Record<Task['status'], string> = {
  pending: '○',
  running: '◑',
  completed: '●',
  failed: '✕',
}

export function TaskPanel() {
  const tasks = useAppStore((s) => s.tasks)

  if (tasks.length === 0) {
    return (
      <div style={{ padding: '20px', color: '#4b5563', fontSize: '13px', textAlign: 'center' }}>
        No tasks yet
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px' }}>
      {tasks.map((task) => (
        <div
          key={task.id}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                color: STATUS_COLOR[task.status],
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {STATUS_ICON[task.status]}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: STATUS_COLOR[task.status],
                fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {task.status}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '10px',
                color: '#4b5563',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              #{task.id}
            </span>
          </div>

          <div
            style={{
              fontSize: '13px',
              color: '#d1d5db',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.title}
          </div>

          <div style={{ marginTop: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '10px',
                color:
                  task.assigned_to === 'claude'
                    ? '#a78bfa'
                    : task.assigned_to === 'openai' || task.assigned_to === 'codex'
                    ? '#34d399'
                    : '#6b7280',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {task.assigned_to === 'claude'
                ? '◆ Claude'
                : task.assigned_to === 'codex'
                ? '⬡ Codex'
                : task.assigned_to === 'openai'
                ? '● GPT-4'
                : task.assigned_to}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
