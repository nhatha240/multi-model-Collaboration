import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { MessageBubble } from './MessageBubble'
import { api } from '../services/api'
import type { LiveMessage } from '../types'

interface Props {
  projectId: number
}

export function ChatInterface({ projectId }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { liveMessages, isProcessing, isConnected, addLiveMessage, setTasks } = useAppStore()
  const { sendMessage } = useWebSocket(projectId)

  // Load tasks on mount
  useEffect(() => {
    api.getTasks(projectId).then(setTasks)
  }, [projectId, setTasks])

  // Load history messages as live messages on mount
  useEffect(() => {
    api.getMessages(projectId).then((msgs) => {
      const live: LiveMessage[] = msgs.map((m) => ({
        id: `hist-${m.id}`,
        agent: m.role as LiveMessage['agent'],
        content: m.content,
        type: 'message',
        timestamp: new Date(m.created_at).getTime(),
      }))
      live.forEach((m) => addLiveMessage(m))
    })
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveMessages])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isProcessing || !isConnected) return

    // Show user message immediately
    addLiveMessage({
      id: `user-${Date.now()}`,
      agent: 'user',
      content: trimmed,
      type: 'message',
      timestamp: Date.now(),
    })

    sendMessage(trimmed)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0a0a0c',
      }}
    >
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {liveMessages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#374151',
              gap: '12px',
              paddingTop: '60px',
            }}
          >
            <div style={{ fontSize: '40px', opacity: 0.3 }}>◆</div>
            <div style={{ fontSize: '15px' }}>Ask Claude to plan, code, or collaborate</div>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>Claude orchestrates · GPT-4 implements</div>
          </div>
        )}

        {liveMessages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {isProcessing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', opacity: 0.6 }}>
            <ProcessingDots />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#0d0d10',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${isConnected ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '12px',
            padding: '10px 14px',
            transition: 'border-color 0.2s',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKey}
            placeholder={
              !isConnected
                ? 'Connecting...'
                : isProcessing
                ? 'Agents are working...'
                : 'Ask Claude to orchestrate tasks, write code, plan features...'
            }
            disabled={isProcessing || !isConnected}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e5e7eb',
              fontSize: '14px',
              lineHeight: '1.5',
              resize: 'none',
              fontFamily: 'Inter, sans-serif',
              minHeight: '24px',
              maxHeight: '160px',
              overflowY: 'auto',
            }}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing || !isConnected}
            style={{
              background: input.trim() && !isProcessing && isConnected ? '#7c3aed' : 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              color: input.trim() && !isProcessing && isConnected ? '#fff' : '#4b5563',
              fontSize: '13px',
              cursor: input.trim() && !isProcessing && isConnected ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {isProcessing ? '···' : '↑ Send'}
          </button>
        </div>

        <div
          style={{
            marginTop: '8px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            fontSize: '11px',
            color: '#4b5563',
          }}
        >
          <span>⏎ send · ⇧⏎ newline</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isConnected ? '#34d399' : '#6b7280',
                display: 'inline-block',
              }}
            />
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  )
}

function ProcessingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '8px' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#a78bfa',
            animation: `bounce 1.2s ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
