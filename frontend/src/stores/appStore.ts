import { create } from 'zustand'
import type { Project, Task, LiveMessage } from '../types'

interface AppState {
  projects: Project[]
  activeProject: Project | null
  tasks: Task[]
  liveMessages: LiveMessage[]
  isConnected: boolean
  isProcessing: boolean

  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (project: Project) => void
  removeProject: (id: number) => void
  setActiveProject: (project: Project | null) => void
  setTasks: (tasks: Task[]) => void
  updateTask: (id: number, updates: Partial<Task>) => void
  addLiveMessage: (msg: LiveMessage) => void
  clearLiveMessages: () => void
  setConnected: (v: boolean) => void
  setProcessing: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  activeProject: null,
  tasks: [],
  liveMessages: [],
  isConnected: false,
  isProcessing: false,

  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
  updateProject: (project) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === project.id ? project : p)),
      activeProject: s.activeProject?.id === project.id ? project : s.activeProject,
    })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
  setActiveProject: (project) => set({ activeProject: project, liveMessages: [], tasks: [] }),
  setTasks: (tasks) => set({ tasks }),
  updateTask: (id, updates) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
  addLiveMessage: (msg) =>
    set((s) => {
      const last = s.liveMessages[s.liveMessages.length - 1]
      if (msg.type === 'stream' && last && last.type === 'stream' && last.agent === msg.agent) {
        return {
          liveMessages: [
            ...s.liveMessages.slice(0, -1),
            {
              ...last,
              content: last.content + msg.content,
              timestamp: msg.timestamp,
            },
          ],
        }
      }

      return { liveMessages: [...s.liveMessages, msg] }
    }),
  clearLiveMessages: () => set({ liveMessages: [] }),
  setConnected: (v) => set({ isConnected: v }),
  setProcessing: (v) => set({ isProcessing: v }),
}))
