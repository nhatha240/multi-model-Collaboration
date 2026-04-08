import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { api } from '../services/api'
import type { Project } from '../types'

interface PlanConfig {
  plan: 'free' | 'pro' | 'enterprise'
  claude_model: string
  openai_model: string
  coder_backend: 'local' | 'openai'
  codex_base_url: string | null
  max_tokens: number
  max_tasks: number
}

const PLAN_COLOR: Record<string, string> = {
  free: '#6b7280',
  pro: '#a78bfa',
  enterprise: '#f59e0b',
}

export function ProjectSidebar() {
  const { projects, activeProject, addProject, removeProject, setActiveProject, clearLiveMessages } =
    useAppStore()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [localPath, setLocalPath] = useState('')
  const [formError, setFormError] = useState('')
  const [planConfig, setPlanConfig] = useState<PlanConfig | null>(null)

  useEffect(() => {
    fetch('/config')
      .then((r) => r.json())
      .then(setPlanConfig)
      .catch(() => null)
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      setFormError('')
      const project = await api.createProject(name.trim(), desc.trim(), localPath.trim())
      addProject(project)
      setName('')
      setDesc('')
      setLocalPath('')
      setShowCreate(false)
      handleSelect(project)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create project')
    }
  }

  const handleSelect = (project: Project) => {
    clearLiveMessages()
    setActiveProject(project)
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Delete project and all its messages?')) return
    try {
      await api.deleteProject(id)
      removeProject(id)
      if (activeProject?.id === id) setActiveProject(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to delete project')
    }
  }

  return (
    <aside
      style={{
        width: '240px',
        minWidth: '240px',
        background: '#0d0d10',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '18px 16px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ color: '#a78bfa', fontSize: '18px' }}>◆</span>
          <span style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600, letterSpacing: '-0.01em' }}>
            Multi-Model
          </span>
        </div>

        <div
          style={{
            fontSize: '10px',
            color: '#4b5563',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Projects
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            width: '100%',
            background: 'rgba(167,139,250,0.1)',
            border: '1px dashed rgba(167,139,250,0.25)',
            borderRadius: '7px',
            padding: '7px 10px',
            color: '#a78bfa',
            fontSize: '12px',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          + New project
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(167,139,250,0.04)',
          }}
        >
          <input
            autoFocus
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            style={inputStyle}
          />
          <textarea
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'none', marginTop: '6px' }}
          />
          <input
            placeholder="Local folder path (optional)"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            style={{ ...inputStyle, marginTop: '6px', fontFamily: 'JetBrains Mono, monospace' }}
          />
          {formError && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#fca5a5', lineHeight: 1.5 }}>
              {formError}
            </div>
          )}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <button onClick={handleCreate} style={btnStyle('#7c3aed', '#fff')}>
              Create
            </button>
            <button onClick={() => setShowCreate(false)} style={btnStyle('transparent', '#6b7280')}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Project list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {projects.length === 0 && (
          <div style={{ padding: '20px 8px', color: '#374151', fontSize: '12px', textAlign: 'center' }}>
            Create your first project
          </div>
        )}
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => handleSelect(p)}
            style={{
              padding: '9px 10px',
              borderRadius: '7px',
              cursor: 'pointer',
              background: activeProject?.id === p.id ? 'rgba(167,139,250,0.1)' : 'transparent',
              border: `1px solid ${activeProject?.id === p.id ? 'rgba(167,139,250,0.2)' : 'transparent'}`,
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ color: activeProject?.id === p.id ? '#a78bfa' : '#4b5563', fontSize: '12px' }}>
              ◇
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  color: activeProject?.id === p.id ? '#e5e7eb' : '#9ca3af',
                  fontWeight: activeProject?.id === p.id ? 500 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </div>
              {p.local_path && (
                <div
                  style={{
                    marginTop: '2px',
                    fontSize: '10px',
                    color: activeProject?.id === p.id ? '#8b93a7' : '#4b5563',
                    fontFamily: 'JetBrains Mono, monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={p.local_path}
                >
                  ↳ {p.local_path}
                </div>
              )}
            </div>
            <button
              onClick={(e) => handleDelete(e, p.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#374151',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: '12px',
                borderRadius: '4px',
                opacity: 0,
                transition: 'opacity 0.15s',
              }}
              className="delete-btn"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Footer — plan info */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: '11px',
          color: '#374151',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        {planConfig ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '99px',
                  background: `${PLAN_COLOR[planConfig.plan]}18`,
                  border: `1px solid ${PLAN_COLOR[planConfig.plan]}33`,
                  color: PLAN_COLOR[planConfig.plan],
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {planConfig.plan}
              </span>
              <span style={{ color: '#4b5563' }}>{planConfig.max_tokens / 1000}k tokens</span>
            </div>
            <div style={{ color: '#4b5563', lineHeight: 1.6 }}>
              <div>◆ {planConfig.claude_model.split('-').slice(1, 3).join('-')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {planConfig.coder_backend === 'local' ? (
                  <>
                    <span style={{ color: '#34d399' }}>⬡</span>
                    <span>{planConfig.openai_model}</span>
                    <span
                      style={{
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: 'rgba(52,211,153,0.12)',
                        border: '1px solid rgba(52,211,153,0.2)',
                        color: '#34d399',
                        fontSize: '9px',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                      }}
                    >
                      LOCAL
                    </span>
                  </>
                ) : (
                  <>
                    <span>●</span>
                    <span>{planConfig.openai_model}</span>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div>◆ Claude · ● GPT-4</div>
        )}
      </div>
    </aside>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '6px',
  padding: '7px 9px',
  color: '#e5e7eb',
  fontSize: '12px',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box',
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    flex: 1,
    padding: '6px',
    background: bg,
    border: `1px solid ${bg === 'transparent' ? 'rgba(255,255,255,0.08)' : bg}`,
    borderRadius: '6px',
    color,
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 500,
  }
}
