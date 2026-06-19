# Async URL Checker

Сервис асинхронной проверки списка URL (backend + frontend) для тестового задания.

## Что реализуется по ТЗ

- Backend API для создания, просмотра и отмены заданий проверки URL.
- Асинхронная обработка URL через `HEAD` запросы.
- Ограничение параллелизма: не более `5` одновременных проверок на одно задание.
- Frontend для запуска заданий, просмотра списка и детальной прогресс-статистики.
- Polling на фронтенде для актуализации статуса активного задания.

## Технологический стек

- Backend: `Node.js`, `TypeScript`, `NestJS`
- Frontend: `TypeScript`, `React`, `Zustand`
- Runtime storage (для тестового): `in-memory` (`Map`)
- Контейнеризация: `Docker`, `docker compose`

## Архитектурные принципы

Проект проектируется с заделом на production-эволюцию, при этом текущая реализация остается в рамках тестового (in-memory):

- Чистое разделение слоев:
  - `domain/application` (бизнес-логика статусов и обработки job)
  - `ports` (контракты для репозитория и очереди/диспетчера)
  - `infrastructure` (текущие адаптеры на `Map`, далее можно заменить на БД и брокер)
  - `api` (контроллеры, DTO, сериализация)
- Репозиторный слой (`JobRepository`) фиксирует контракт хранения, чтобы без переписывания бизнес-логики переключиться:
  - с `InMemoryJobRepository`
  - на `PostgresJobRepository`/`MongoRepository` и т.д.
- Конкурентность реализуется на уровне оркестрации задания (до 5 in-flight проверок внутри одного job), без `cron` как основного механизма исполнения.

## API контракт

Базовый префикс: `/api`

### 1) Создать задание

`POST /api/jobs`

Request:

```json
{
  "urls": ["https://example.com", "https://google.com"]
}
```

Response `201`:

```json
{
  "jobId": "7c0a4f27-9a3f-4a2f-8f9e-b5f1d6bd2f4b"
}
```

Поведение:
- Создается job со статусом `pending`.
- Асинхронная обработка запускается в фоне.

### 2) Список заданий

`GET /api/jobs`

Response `200`:

```json
[
  {
    "id": "7c0a4f27-9a3f-4a2f-8f9e-b5f1d6bd2f4b",
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

### 3) Детали задания

`GET /api/jobs/:id`

Response `200`:

```json
{
  "id": "7c0a4f27-9a3f-4a2f-8f9e-b5f1d6bd2f4b",
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
      "finishedAt": "2026-06-19T10:00:04.000Z",
      "durationMs": 3000
    },
    {
      "url": "https://google.com",
      "status": "in_progress"
    }
  ]
}
```

### 4) Отменить задание

`DELETE /api/jobs/:id`

Response `200`:

```json
{
  "id": "7c0a4f27-9a3f-4a2f-8f9e-b5f1d6bd2f4b",
  "status": "cancelled"
}
```

Поведение:
- Job помечается `cancelled`.
- URL со статусом `pending` переводятся в `cancelled`.
- URL в `in_progress` завершаются естественно.

## Модель статусов

### Job status

- `pending`
- `in_progress`
- `completed`
- `cancelled`
- `failed`

### URL item status

- `pending`
- `in_progress`
- `success`
- `error`
- `cancelled`

## Формат ошибок API

Минимальный целевой формат:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

Типовые коды:
- `400` — невалидный payload/URL
- `404` — job не найден
- `500` — внутренняя ошибка

## Как запускать проект

> Ниже целевой способ запуска для разработки и контейнерного режима.
> Если на текущем этапе не хватает файлов (`docker-compose.yml`, frontend scripts), они будут добавлены в следующих итерациях.

### Development

Backend:

```bash
cd backend
npm i
npm run start:dev
```

Frontend:

```bash
cd frontend
npm i
npm run dev
```

### Production-like (Docker)

```bash
docker compose up --build
```

Остановка:

```bash
docker compose down
```

## Ограничения текущей тестовой реализации

- Хранилище в памяти процесса (`Map`), без персистентности между рестартами.
- Нет внешнего брокера очередей.
- Нет distributed-locking и горизонтального масштабирования воркеров.
- Retry/Backoff политика не обязательна по ТЗ и может быть отключена для упрощения.

## TODO при выходе за рамки тестового

- Перейти с `InMemoryJobRepository` на БД (PostgreSQL/MongoDB).
- Вынести очередь задач в брокер (`Redis/BullMQ`, `RabbitMQ`, `Kafka`, `SQS`).
- Добавить `outbox`/идемпотентность публикации событий.
- Добавить heartbeat/reconciler для зависших `in_progress` задач.
- Добавить retry policy + DLQ.
- Добавить метрики, трейсинг, structured logging, алерты.
- Добавить e2e и нагрузочные тесты.

