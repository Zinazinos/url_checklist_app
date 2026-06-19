import { useState } from 'react'
import type { FormEvent } from 'react'

interface CreateJobFormProps {
  isSubmitting: boolean
  error: string | null
  onSubmit: (rawInput: string) => Promise<void>
}

export function CreateJobForm({ isSubmitting, error, onSubmit }: CreateJobFormProps) {
  const [input, setInput] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(input)
  }

  return (
    <section className="card">
      <h2>Создать задание</h2>
      <form className="create-job-form" onSubmit={(event) => void handleSubmit(event)}>
        <label htmlFor="url-input">Список URL (каждый с новой строки)</label>
        <textarea
          id="url-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={'https://example.com\nhttps://google.com'}
          rows={6}
          disabled={isSubmitting}
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Запуск...' : 'Запустить проверку'}
        </button>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  )
}
