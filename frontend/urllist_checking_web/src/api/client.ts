import type { ApiErrorResponse } from '../types/jobs'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiRequestError extends Error {
  public readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

function toErrorMessage(payload: ApiErrorResponse | undefined, fallback: string): string {
  if (!payload) {
    return fallback
  }

  if (Array.isArray(payload.message)) {
    return payload.message.join(', ')
  }

  if (payload.message) {
    return payload.message
  }

  return payload.error ?? fallback
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error'
    throw new ApiRequestError(`Ошибка сети: ${message}`)
  }

  const rawText = await response.text()
  const parsedBody = rawText ? (JSON.parse(rawText) as unknown) : undefined

  if (!response.ok) {
    const errorPayload = parsedBody as ApiErrorResponse | undefined
    throw new ApiRequestError(
      toErrorMessage(errorPayload, `Request failed with status ${response.status}`),
      response.status,
    )
  }

  return parsedBody as T
}
