import { useState, useRef, useEffect, KeyboardEvent, useMemo } from 'react'
import { useStore, AIMessage, AI_MODELS, AIProvider } from '../../stores/useStore'
import './AIPanel.css'

// Key for untitled documents (must match store)
const UNTITLED_KEY = '__untitled__'

export function AIPanel() {
  const {
    aiPanelOpen,
    aiMessagesByDocument,
    aiLoading,
    aiProvider,
    aiModel,
    aiApiKey,
    selectedText,
    currentFile,
    setAIPanelOpen,
    addAIMessage,
    clearAIMessages,
    setAILoading,
    setAIProvider,
    setAIModel,
    setAIApiKey,
    setSelectedText
  } = useStore()

  // Get messages for current document
  const documentKey = currentFile.filePath || UNTITLED_KEY
  const aiMessages = useMemo(() => {
    return aiMessagesByDocument[documentKey] || []
  }, [aiMessagesByDocument, documentKey])

  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  // Focus input when panel opens
  useEffect(() => {
    if (aiPanelOpen) {
      inputRef.current?.focus()
    }
  }, [aiPanelOpen])

  // Load API key from secure storage when provider changes
  useEffect(() => {
    if (aiProvider === 'ollama') return // Ollama doesn't need API key

    window.electronAPI?.loadApiKey(aiProvider).then((key) => {
      if (key) {
        setAIApiKey(key)
      }
    }).catch(() => {
      // Ignore errors during load
    })
  }, [aiProvider, setAIApiKey])

  // Save API key when it changes
  const handleApiKeyChange = (newKey: string) => {
    setAIApiKey(newKey)
    if (newKey && aiProvider !== 'ollama') {
      window.electronAPI?.saveApiKey({ provider: aiProvider, apiKey: newKey }).catch(() => {
        // Ignore save errors
      })
    }
  }

  // Handle sending message
  const sendMessage = async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || aiLoading) return

    // Check if API key is set (not needed for Ollama)
    if (aiProvider !== 'ollama' && !aiApiKey) {
      setShowSettings(true)
      return
    }

    // Build context message
    let contextInfo = ''
    if (selectedText) {
      contextInfo = `\n\n[Selected text: "${selectedText}"]`
      setSelectedText('') // Clear after using
    }

    const userMessage = trimmedInput + contextInfo

    // Add user message to chat
    addAIMessage({ role: 'user', content: userMessage })
    setInput('')
    setAILoading(true)

    // Add placeholder for assistant response
    addAIMessage({ role: 'assistant', content: '' })

    try {
      // Call AI via Electron IPC
      const response = await window.electronAPI.callAI({
        messages: [...aiMessages, { role: 'user', content: userMessage }],
        documentContent: currentFile.content,
        apiKey: aiApiKey,
        provider: aiProvider,
        model: aiModel
      })

      // Update the assistant message with response
      useStore.getState().updateLastAIMessage(response)
    } catch (error) {
      console.error('AI call failed:', error)
      useStore.getState().updateLastAIMessage(
        'Sorry, I encountered an error. Please check your API key and try again.'
      )
    } finally {
      setAILoading(false)
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!aiPanelOpen) return null

  return (
    <>
      <div
        className="ai-panel-overlay"
        onClick={() => setAIPanelOpen(false)}
      />
      <aside className="ai-panel">
        {/* Header */}
        <div className="ai-panel-header">
          <div className="ai-panel-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
              <circle cx="8" cy="14" r="1.5" fill="currentColor" />
              <circle cx="16" cy="14" r="1.5" fill="currentColor" />
            </svg>
            <span>AI Assistant</span>
          </div>
          <div className="ai-panel-actions">
            <button
              className="ai-panel-action"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </button>
            <button
              className="ai-panel-action"
              onClick={clearAIMessages}
              title="Clear chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </button>
            <button
              className="ai-panel-action"
              onClick={() => setAIPanelOpen(false)}
              title="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="ai-settings">
            <div className="ai-settings-row">
              <label>Provider</label>
              <select
                value={aiProvider}
                onChange={(e) => setAIProvider(e.target.value as AIProvider)}
              >
                <option value="claude">Claude</option>
                <option value="openai">OpenAI</option>
                <option value="ollama">Ollama (Local)</option>
              </select>
            </div>
            <div className="ai-settings-row">
              <label>Model</label>
              <select
                value={aiModel}
                onChange={(e) => setAIModel(e.target.value)}
              >
                {AI_MODELS[aiProvider].map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            {aiProvider !== 'ollama' && (
              <div className="ai-settings-row">
                <label>API Key</label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={`Enter ${aiProvider === 'claude' ? 'Anthropic' : 'OpenAI'} API key`}
                />
              </div>
            )}
            <button
              className="ai-settings-done"
              onClick={() => setShowSettings(false)}
            >
              Done
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="ai-messages">
          {aiMessages.length === 0 ? (
            <div className="ai-empty-state">
              <div className="ai-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p>Ask questions about your document</p>
              <div className="ai-suggestions">
                <button onClick={() => setInput('Summarize this document')}>
                  Summarize this document
                </button>
                <button onClick={() => setInput('Check for grammar issues')}>
                  Check grammar
                </button>
                <button onClick={() => setInput('Suggest improvements')}>
                  Suggest improvements
                </button>
              </div>
            </div>
          ) : (
            aiMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Selected text indicator */}
        {selectedText && (
          <div className="ai-selected-text">
            <span>Selected:</span>
            <span className="ai-selected-preview">
              {selectedText.length > 50 ? selectedText.slice(0, 50) + '...' : selectedText}
            </span>
            <button onClick={() => setSelectedText('')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Input */}
        <div className="ai-input-area">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your document..."
            rows={1}
            disabled={aiLoading}
          />
          <button
            className="ai-send-button"
            onClick={sendMessage}
            disabled={aiLoading || !input.trim()}
          >
            {aiLoading ? (
              <svg width="18" height="18" viewBox="0 0 24 24" className="ai-spinner">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="60" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}

// Message bubble component
function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`ai-message ${isUser ? 'ai-message-user' : 'ai-message-assistant'}`}>
      {!isUser && (
        <div className="ai-message-avatar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
          </svg>
        </div>
      )}
      <div className="ai-message-content">
        {message.content || <span className="ai-typing">Thinking...</span>}
      </div>
    </div>
  )
}
