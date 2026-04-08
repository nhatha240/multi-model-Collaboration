export interface Project {
  id: number
  name: string
  description: string
  local_path: string
  created_at: string
}

export interface ProjectFileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
}

export interface ProjectFileContent {
  path: string
  content: string
}

export interface Task {
  id: number
  project_id: number
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  assigned_to: string
  result: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  project_id: number
  role: 'user' | 'claude' | 'openai' | 'codex' | 'system'
  content: string
  created_at: string
}

export interface WSEvent {
  type: 'thinking' | 'message' | 'stream' | 'task_update' | 'delegation' | 'done' | 'error'
  agent: 'claude' | 'openai' | 'codex' | 'system' | 'user'
  content: string
  meta?: Record<string, unknown>
}

// Live events shown in the chat stream
export interface LiveMessage {
  id: string
  agent: WSEvent['agent']
  content: string
  type: WSEvent['type']
  timestamp: number
}
