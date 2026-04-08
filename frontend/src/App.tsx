import { useEffect, useState } from 'react'
import { ProjectSidebar } from './components/ProjectSidebar'
import { ChatInterface } from './components/ChatInterface'
import { ProjectWorkspace } from './components/ProjectWorkspace'
import { TaskPanel } from './components/TaskPanel'
import { useAppStore } from './stores/appStore'
import { api } from './services/api'

export default function App() {
  const { activeProject, tasks, setProjects, updateProject } = useAppStore()
  const [coderBackend, setCoderBackend] = useState<'local' | 'openai'>('openai')
  const [coderModel, setCoderModel] = useState('GPT-4o')
  const [showProjectSettings, setShowProjectSettings] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectLocalPath, setProjectLocalPath] = useState('')
  const [projectFormError, setProjectFormError] = useState('')
  const [savingProject, setSavingProject] = useState(false)

  useEffect(() => {
    api.getProjects().then(setProjects)
    fetch('/config')
      .then((r) => r.json())
      .then((c) => {
        setCoderBackend(c.coder_backend)
        setCoderModel(c.openai_model)
      })
      .catch(() => null)
  }, [setProjects])

  useEffect(() => {
    if (!activeProject) {
      setShowProjectSettings(false)
      return
    }

    setProjectName(activeProject.name)
    setProjectDescription(activeProject.description)
    setProjectLocalPath(activeProject.local_path)
    setProjectFormError('')
  }, [activeProject])

  async function handleSaveProjectSettings() {
    if (!activeProject || !projectName.trim()) return

    setSavingProject(true)
    setProjectFormError('')

    try {
      const updated = await api.updateProject(activeProject.id, {
        name: projectName.trim(),
        description: projectDescription.trim(),
        local_path: projectLocalPath.trim(),
      })
      updateProject(updated)
      setShowProjectSettings(false)
    } catch (error) {
      setProjectFormError(error instanceof Error ? error.message : 'Unable to update project')
    } finally {
      setSavingProject(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: '#0a0a0c',
        color: '#e5e7eb',
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <ProjectSidebar />

      {/* Main area */}
      {activeProject ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Project header */}
          <header
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: '#0d0d10',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#e5e7eb' }}>
                {activeProject.name}
              </div>
              {activeProject.description && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>
                  {activeProject.description}
                </div>
              )}
              {activeProject.local_path && (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#64748b',
                    marginTop: '5px',
                    fontFamily: 'JetBrains Mono, monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '520px',
                  }}
                  title={activeProject.local_path}
                >
                  Local workspace: {activeProject.local_path}
                </div>
              )}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setShowProjectSettings(true)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  padding: '7px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Edit project
              </button>
              <AgentPill color="#a78bfa" label="◆ Claude" subtitle="Orchestrator" />
              <AgentPill
                color="#34d399"
                label={activeProject.local_path ? '⬡ Codex CLI' : `${coderBackend === 'local' ? '⬡' : '●'} ${coderModel}`}
                subtitle={activeProject.local_path ? 'Workspace · Local CLI' : coderBackend === 'local' ? 'Local · Ollama' : 'Cloud · Coder'}
              />
            </div>
          </header>

          {/* Body: chat + task panel */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <div
              style={{
                width: '48%',
                minWidth: '360px',
                borderRight: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <ProjectWorkspace
                project={activeProject}
                onEditProject={() => setShowProjectSettings(true)}
              />
            </div>

            <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ChatInterface projectId={activeProject.id} />
              </div>

              {tasks.length > 0 && (
                <div
                  style={{
                    width: '260px',
                    borderLeft: '1px solid rgba(255,255,255,0.06)',
                    background: '#0d0d10',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      fontSize: '11px',
                      color: '#4b5563',
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Tasks · {tasks.length}
                  </div>
                  <TaskPanel />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            color: '#374151',
          }}
        >
          <div style={{ fontSize: '56px', opacity: 0.15 }}>◆</div>
          <div style={{ fontSize: '18px', color: '#4b5563', fontWeight: 500 }}>
            Multi-Model Collaboration
          </div>
          <div style={{ fontSize: '14px', maxWidth: '380px', textAlign: 'center', lineHeight: 1.6 }}>
            Claude orchestrates · GPT-4 implements · real-time collaboration across projects
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.5 }}>
            ← Select or create a project
          </div>
        </div>
      )}

      {showProjectSettings && activeProject && (
        <div
          onClick={() => !savingProject && setShowProjectSettings(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(2,6,23,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 20,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '560px',
              background: '#0d0d10',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '18px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#e5e7eb' }}>Edit project</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: 1.6 }}>
              Link this project to a real local folder, then browse and edit UTF-8 text files directly in the workspace panel.
            </div>

            <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Project name"
                style={modalInputStyle}
              />
              <textarea
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                placeholder="Description"
                rows={3}
                style={{ ...modalInputStyle, resize: 'vertical', minHeight: '86px' }}
              />
              <input
                value={projectLocalPath}
                onChange={(event) => setProjectLocalPath(event.target.value)}
                placeholder="/absolute/path/to/project"
                style={{ ...modalInputStyle, fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>

            {projectFormError && (
              <div style={{ marginTop: '12px', color: '#fca5a5', fontSize: '12px' }}>
                {projectFormError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => void handleSaveProjectSettings()}
                disabled={savingProject || !projectName.trim()}
                style={{
                  flex: 1,
                  background: '#7c3aed',
                  color: '#fff',
                  border: '1px solid #7c3aed',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: savingProject || !projectName.trim() ? 'not-allowed' : 'pointer',
                  opacity: savingProject || !projectName.trim() ? 0.45 : 1,
                }}
              >
                {savingProject ? 'Saving...' : 'Save project'}
              </button>
              <button
                onClick={() => setShowProjectSettings(false)}
                disabled={savingProject}
                style={{
                  padding: '9px 12px',
                  background: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: savingProject ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AgentPill({ color, label, subtitle }: { color: string; label: string; subtitle: string }) {
  return (
    <div
      style={{
        padding: '6px 12px',
        background: `${color}11`,
        border: `1px solid ${color}22`,
        borderRadius: '8px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '12px', color, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '10px', color: '#4b5563', fontFamily: 'JetBrains Mono, monospace' }}>
        {subtitle}
      </div>
    </div>
  )
}

const modalInputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  padding: '10px 12px',
  color: '#e5e7eb',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box' as const,
}
