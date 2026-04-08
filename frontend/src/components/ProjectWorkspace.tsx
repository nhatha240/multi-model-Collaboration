import { useEffect, useState } from 'react'

import { api } from '../services/api'
import type { Project, ProjectFileEntry } from '../types'

interface Props {
  project: Project
  onEditProject: () => void
}

export function ProjectWorkspace({ project, onEditProject }: Props) {
  const [entriesByDir, setEntriesByDir] = useState<Record<string, ProjectFileEntry[]>>({})
  const [expandedDirs, setExpandedDirs] = useState<string[]>([''])
  const [loadingDirs, setLoadingDirs] = useState<Record<string, boolean>>({})
  const [selectedFile, setSelectedFile] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [loadingFile, setLoadingFile] = useState(false)
  const [savingFile, setSavingFile] = useState(false)
  const [error, setError] = useState('')

  const isDirty = selectedFile !== '' && draftContent !== originalContent

  useEffect(() => {
    setEntriesByDir({})
    setExpandedDirs([''])
    setLoadingDirs({})
    setSelectedFile('')
    setOriginalContent('')
    setDraftContent('')
    setError('')

    if (project.local_path) {
      void loadDirectory('')
    }
  }, [project.id, project.local_path])

  async function loadDirectory(relativePath: string, force = false) {
    if (!project.local_path) return
    if (!force && entriesByDir[relativePath]) return

    setLoadingDirs((current) => ({ ...current, [relativePath]: true }))
    setError('')

    try {
      const entries = await api.getProjectFiles(project.id, relativePath)
      setEntriesByDir((current) => ({ ...current, [relativePath]: entries }))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load project files')
    } finally {
      setLoadingDirs((current) => ({ ...current, [relativePath]: false }))
    }
  }

  async function handleToggleDirectory(relativePath: string) {
    const isExpanded = expandedDirs.includes(relativePath)
    if (isExpanded) {
      setExpandedDirs((current) => current.filter((path) => path !== relativePath))
      return
    }

    setExpandedDirs((current) => [...current, relativePath])
    if (!entriesByDir[relativePath]) {
      await loadDirectory(relativePath)
    }
  }

  async function handleSelectFile(relativePath: string) {
    if (relativePath === selectedFile) return
    if (isDirty && !window.confirm('Discard unsaved changes in the current file?')) return

    setLoadingFile(true)
    setError('')

    try {
      const file = await api.getProjectFileContent(project.id, relativePath)
      setSelectedFile(file.path)
      setOriginalContent(file.content)
      setDraftContent(file.content)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to open file')
    } finally {
      setLoadingFile(false)
    }
  }

  async function handleSaveFile() {
    if (!selectedFile) return

    setSavingFile(true)
    setError('')

    try {
      const file = await api.saveProjectFileContent(project.id, selectedFile, draftContent)
      setOriginalContent(file.content)
      setDraftContent(file.content)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save file')
    } finally {
      setSavingFile(false)
    }
  }

  function renderTree(relativePath = '', depth = 0): JSX.Element[] {
    const entries = entriesByDir[relativePath] || []

    return entries.flatMap((entry) => {
      const isDirectory = entry.type === 'directory'
      const isExpanded = expandedDirs.includes(entry.path)
      const isSelected = selectedFile === entry.path
      const row = (
        <div key={entry.path}>
          <button
            onClick={() => (isDirectory ? void handleToggleDirectory(entry.path) : void handleSelectFile(entry.path))}
            style={{
              ...treeRowStyle,
              paddingLeft: `${14 + depth * 16}px`,
              color: isSelected ? '#f8fafc' : '#a7afc0',
              background: isSelected ? 'rgba(124,58,237,0.18)' : 'transparent',
              borderColor: isSelected ? 'rgba(167,139,250,0.25)' : 'transparent',
            }}
            title={entry.path}
          >
            <span style={{ width: '16px', color: isSelected ? '#c4b5fd' : '#586174' }}>
              {isDirectory ? (isExpanded ? '▾' : '▸') : '·'}
            </span>
            <span
              style={{
                fontFamily: isDirectory ? 'Inter, sans-serif' : 'JetBrains Mono, monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {entry.name}
            </span>
          </button>
          {isDirectory && isExpanded && (
            <div>
              {loadingDirs[entry.path] ? (
                <div style={{ ...hintStyle, paddingLeft: `${30 + depth * 16}px`, paddingTop: '4px' }}>
                  Loading...
                </div>
              ) : (
                renderTree(entry.path, depth + 1)
              )}
            </div>
          )}
        </div>
      )

      return [row]
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#09090b',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#5b6475', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Workspace
          </div>
          <div
            style={{
              marginTop: '4px',
              fontSize: '12px',
              color: project.local_path ? '#cbd5e1' : '#64748b',
              fontFamily: 'JetBrains Mono, monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={project.local_path || 'No local folder linked'}
          >
            {project.local_path || 'No local folder linked'}
          </div>
        </div>

        <button onClick={onEditProject} style={secondaryButtonStyle}>
          {project.local_path ? 'Edit project' : 'Link folder'}
        </button>
      </div>

      {!project.local_path ? (
        <div style={placeholderWrapStyle}>
          <div style={{ fontSize: '16px', color: '#e2e8f0', fontWeight: 600 }}>Link a local folder</div>
          <div style={{ ...hintStyle, maxWidth: '380px', textAlign: 'center', lineHeight: 1.6, marginTop: '8px' }}>
            Set `local_path` for this project, then the app will show the real files from your machine and let you edit text files directly here.
          </div>
          <button onClick={onEditProject} style={{ ...primaryButtonStyle, marginTop: '14px' }}>
            Open project settings
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div
            style={{
              width: '280px',
              minWidth: '280px',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Files</div>
              <button onClick={() => void loadDirectory('', true)} style={{ ...secondaryButtonStyle, marginLeft: 'auto' }}>
                Refresh
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {loadingDirs[''] && !entriesByDir[''] ? (
                <div style={hintStyle}>Loading root...</div>
              ) : entriesByDir['']?.length ? (
                renderTree()
              ) : (
                <div style={hintStyle}>No editable files found at the project root.</div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: selectedFile ? '#e2e8f0' : '#64748b',
                    fontFamily: 'JetBrains Mono, monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedFile || 'Select a file to edit'}
                </div>
                <div style={{ ...hintStyle, marginTop: '3px' }}>
                  {selectedFile ? (isDirty ? 'Unsaved changes' : 'Saved') : 'UTF-8 text files up to 1 MB'}
                </div>
              </div>

              <button
                onClick={() => void handleSaveFile()}
                disabled={!selectedFile || !isDirty || savingFile}
                style={{
                  ...primaryButtonStyle,
                  opacity: !selectedFile || !isDirty || savingFile ? 0.45 : 1,
                  cursor: !selectedFile || !isDirty || savingFile ? 'not-allowed' : 'pointer',
                }}
              >
                {savingFile ? 'Saving...' : 'Save file'}
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', color: '#fca5a5', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {error}
              </div>
            )}

            {selectedFile ? (
              <textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                spellCheck={false}
                disabled={loadingFile}
                style={{
                  flex: 1,
                  width: '100%',
                  background: '#05060a',
                  color: '#dbe4f0',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  padding: '18px',
                  fontSize: '13px',
                  lineHeight: 1.7,
                  fontFamily: 'JetBrains Mono, monospace',
                  minHeight: 0,
                }}
              />
            ) : (
              <div style={placeholderWrapStyle}>
                <div style={{ fontSize: '15px', color: '#cbd5e1', fontWeight: 600 }}>Choose a file</div>
                <div style={{ ...hintStyle, marginTop: '8px', maxWidth: '320px', textAlign: 'center', lineHeight: 1.6 }}>
                  Directories expand on the left. Selecting a file loads its current content from your linked local folder.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const treeRowStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  border: '1px solid transparent',
  borderRadius: '8px',
  padding: '7px 10px',
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'left' as const,
  fontSize: '12px',
  marginBottom: '2px',
}

const hintStyle = {
  fontSize: '11px',
  color: '#64748b',
}

const placeholderWrapStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '28px',
}

const primaryButtonStyle = {
  background: '#7c3aed',
  color: '#fff',
  border: '1px solid #7c3aed',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
}

const secondaryButtonStyle = {
  background: 'rgba(255,255,255,0.04)',
  color: '#cbd5e1',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  padding: '7px 10px',
  fontSize: '12px',
  cursor: 'pointer',
}
