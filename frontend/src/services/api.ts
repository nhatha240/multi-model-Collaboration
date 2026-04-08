import type { Message, Project, ProjectFileContent, ProjectFileEntry, Task } from '../types'

const BASE = ''

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const data = await response.json()
      if (typeof data?.detail === 'string') detail = data.detail
    } catch {
      // Ignore JSON parse failures for non-JSON error responses.
    }
    throw new Error(detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  return text ? JSON.parse(text) as T : undefined as T
}

export const api = {
  async getProjects(): Promise<Project[]> {
    return request<Project[]>(`${BASE}/projects`)
  },

  async createProject(name: string, description: string, local_path = ''): Promise<Project> {
    return request<Project>(`${BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, local_path }),
    })
  },

  async updateProject(id: number, data: Partial<Pick<Project, 'name' | 'description' | 'local_path'>>): Promise<Project> {
    return request<Project>(`${BASE}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  async deleteProject(id: number): Promise<void> {
    await request<void>(`${BASE}/projects/${id}`, { method: 'DELETE' })
  },

  async getTasks(projectId: number): Promise<Task[]> {
    return request<Task[]>(`${BASE}/projects/${projectId}/tasks`)
  },

  async getMessages(projectId: number): Promise<Message[]> {
    return request<Message[]>(`${BASE}/projects/${projectId}/messages`)
  },

  async getProjectFiles(projectId: number, path = ''): Promise<ProjectFileEntry[]> {
    const params = new URLSearchParams()
    if (path) params.set('path', path)
    const query = params.toString()
    return request<ProjectFileEntry[]>(`${BASE}/projects/${projectId}/files${query ? `?${query}` : ''}`)
  },

  async getProjectFileContent(projectId: number, path: string): Promise<ProjectFileContent> {
    const params = new URLSearchParams({ path })
    return request<ProjectFileContent>(`${BASE}/projects/${projectId}/files/content?${params.toString()}`)
  },

  async saveProjectFileContent(projectId: number, path: string, content: string): Promise<ProjectFileContent> {
    return request<ProjectFileContent>(`${BASE}/projects/${projectId}/files/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    })
  },
}
