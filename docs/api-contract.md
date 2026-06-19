# API Contract — Async URL Checker

Base path: `/api`

## Overview

Сервис управляет асинхронными заданиями проверки URL через `HEAD` запросы.

- Одно задание (`job`) содержит массив URL.
- URL внутри задания обрабатываются в фоне.
- Лимит параллелизма: максимум `5` одновременных `HEAD` запросов на один job.
- Несколько job могут выполняться параллельно.

## Status Model

### Job statuses

- `pending`
- `in_progress`
- `completed`
- `cancelled`
- `failed`

### Item statuses

- `pending`
- `in_progress`
- `success`
- `error`
- `cancelled`

## Endpoints

### 1) Create job

`POST /api/jobs`

Request body:

```json
{
  "urls": ["https://example.com", "https://google.com"]
}
```

Rules:
- `urls` обязательный массив.
- Каждый элемент должен быть валидным URL с протоколом (`http://` или `https://`).

Success response (`201`):

```json
{
  "jobId": "e06a9aa9-8e6d-4f49-bca4-e4a3f17499f6"
}
```

Behavior:
- Создается job в статусе `pending`.
- Фоновая обработка запускается сразу после создания.

### 2) List jobs

`GET /api/jobs`

Success response (`200`):

```json
[
  {
    "id": "e06a9aa9-8e6d-4f49-bca4-e4a3f17499f6",
    "createdAt": "2026-06-19T10:00:00.000Z",
    "status": "in_progress",
    "totalCount": 2,
    "stats": {
      "success": 1,
      "error": 0,
      "cancelled": 0,
      "processed": 1
    }
  }
]
```

### 3) Get job details

`GET /api/jobs/:id`

Success response (`200`):

```json
{
  "id": "e06a9aa9-8e6d-4f49-bca4-e4a3f17499f6",
  "createdAt": "2026-06-19T10:00:00.000Z",
  "status": "in_progress",
  "totalCount": 2,
  "stats": {
    "success": 1,
    "error": 0,
    "cancelled": 0,
    "processed": 1
  },
  "items": [
    {
      "url": "https://example.com",
      "status": "success",
      "httpStatus": 200,
      "startedAt": "2026-06-19T10:00:01.000Z",
      "finishedAt": "2026-06-19T10:00:03.000Z",
      "durationMs": 2000
    },
    {
      "url": "https://google.com",
      "status": "in_progress"
    }
  ]
}
```

### 4) Cancel job

`DELETE /api/jobs/:id`

Success response (`200`):

```json
{
  "id": "e06a9aa9-8e6d-4f49-bca4-e4a3f17499f6",
  "status": "cancelled"
}
```

Behavior:
- Job помечается как `cancelled`.
- Элементы в `pending` переходят в `cancelled`.
- Элементы в `in_progress` завершаются естественно.

## Error responses

### Validation error (`400`)

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Not found (`404`)

```json
{
  "statusCode": 404,
  "message": "Job not found",
  "error": "Not Found"
}
```

### Internal error (`500`)

```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

## Non-functional notes

- Перед фиксацией результата URL допускается искусственная задержка `0..10s`.
- Storage для тестового: in-memory.
- Архитектура предусматривает замену in-memory репозитория на БД без изменения контракта API.
