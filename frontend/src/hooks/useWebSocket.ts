import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import type { WSEvent, LiveMessage } from '../types'

export function useWebSocket(projectId: number | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const { addLiveMessage, setConnected, setProcessing, updateTask } = useAppStore()

  const connect = useCallback(() => {
    if (!projectId) return
    const ws = new WebSocket(`ws://localhost:8000/ws/${projectId}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      setProcessing(false)
    }

    ws.onmessage = (e) => {
      const event: WSEvent = JSON.parse(e.data)

      if (event.type === 'done') {
        setProcessing(false)
        return
      }

      if (event.type === 'task_update' && event.meta) {
        const { task_id, status } = event.meta as { task_id: number; status: string }
        if (task_id) updateTask(task_id, { status: status as Task['status'] })
        return
      }

      // Skip empty thinking messages
      if (event.type === 'thinking' && !event.content) return

      const live: LiveMessage = {
        id: `${Date.now()}-${Math.random()}`,
        agent: event.agent,
        content: event.content,
        type: event.type,
        timestamp: Date.now(),
      }
      addLiveMessage(live)
    }

    ws.onerror = () => {
      setConnected(false)
      setProcessing(false)
    }
  }, [projectId, addLiveMessage, setConnected, setProcessing, updateTask])

  useEffect(() => {
    connect()
    return () => {
      const ws = wsRef.current
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'cancel' }))
      }
      ws?.close()
    }
  }, [connect])

  const sendMessage = useCallback(
    (message: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        setProcessing(true)
        wsRef.current.send(JSON.stringify({ message }))
      }
    },
    [setProcessing]
  )

  return { sendMessage }
}

// Workaround: import Task type for updateTask
type Task = import('../types').Task
