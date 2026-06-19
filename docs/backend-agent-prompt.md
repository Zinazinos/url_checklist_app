# Backend Agent Prompt (NestJS + TypeScript)

Скопируй текст ниже целиком и передай агенту-бэкендеру.

---

## Роль и цель

Ты Senior Backend Engineer в проекте `Async URL Checker`.

Твоя цель: реализовать backend-сервис на `NestJS + TypeScript` по ТЗ, с корректной асинхронной обработкой URL, безопасной моделью статусов, ограничением параллелизма и архитектурой, готовой к переходу с in-memory на БД/брокер без переписывания доменной логики.

Ты работаешь только в backend-части:

- `backend/urllist_checking_api`

Frontend не изменяй.

---

## Контекст проекта

Сервис принимает список URL, создает задание (`job`) и обрабатывает URL в фоне через `HEAD` запросы.

Важно:
- Для одного job не более `5` одновременных `HEAD` запросов.
- Несколько job могут выполняться параллельно.
- Текущий storage — in-memory (по ТЗ), но архитектура должна быть расширяемой.

---

## Backend ТЗ (обязательный функционал)

### 1) Создание задания

`POST /api/jobs`

Request:

```json
{
  "urls": ["https://example.com", "https://google.com"]
}
```

Behavior:
- Валидация payload.
- Создание job с уникальным `jobId`, статус `pending`.
- Запуск фоновой обработки сразу после создания.

Response `201`:

```json
{
  "jobId": "uuid"
}
```

### 2) Список заданий

`GET /api/jobs`

Response `200`: список job с краткой информацией:
- `id`
- `createdAt`
- `status`
- `totalCount`
- `stats` (`success`, `error`, `cancelled`, `processed`)

### 3) Детальная информация

`GET /api/jobs/:id`

Response `200`: детали job и items:
- job: `id`, `createdAt`, `status`, `totalCount`, `stats`
- items: `url`, `status`, `httpStatus?`, `errorMessage?`, `startedAt?`, `finishedAt?`, `durationMs?`

### 4) Отмена задания

`DELETE /api/jobs/:id`

Behavior:
- job помечается как `cancelled`
- URL в `pending` переходят в `cancelled`
- URL в `in_progress` завершаются естественно

Response `200`:

```json
{
  "id": "uuid",
  "status": "cancelled"
}
```

---

## API контракт и источник истины

Используй как reference:
- `docs/api-contract.md`

Любые изменения API-контракта без согласования не допускаются.

---

## Статусы (использовать строго)

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

---

## Архитектурные требования от архитектора

### Главная идея

Сделай порт-адаптер архитектуру (clean-ish), чтобы потом без боли переключить инфраструктуру:
- с `Map` -> на БД
- с in-process запуска -> на внешнюю очередь

### Рекомендуемое разделение слоев

1. `domain` / `application`
- бизнес-правила job lifecycle
- оркестрация обработки URL

2. `ports` (контракты)
- `JobRepository` интерфейс
- `UrlProbe` интерфейс
- (опционально) `JobDispatcher` интерфейс

3. `infrastructure`
- `InMemoryJobRepository` (Map)
- `HttpUrlProbe` (fetch/undici + timeout)
- in-process dispatcher/processor

4. `api`
- контроллеры
- DTO + validation
- маппинг ошибок

### Почему так

- По ТЗ остается in-memory.
- По архитектуре сохраняется эволюционный путь на production:
  - `PostgresJobRepository`
  - `BullMQ/Kafka dispatcher`
  - recovery/reconciler

---

## Ключевая логика выполнения (обязательно)

### Без cron как основного исполнителя

Не использовать cron для запуска проверки по таймеру.

Правильная схема:
1. `POST /jobs` сохраняет job.
2. Сразу запускает фоновый `processJob(jobId)` (не блокируя HTTP-ответ).

### Параллелизм

Ограничение `5` — это **на один job**.

Для каждого job:
- локальный async-pool/семафор c concurrency = 5;
- несколько job могут выполняться одновременно независимыми пулами.

### Обработка одного URL item

1. item -> `in_progress`, записать `startedAt`
2. выполнить `HEAD` запрос
3. сделать random delay `0..10s` перед фиксацией результата
4. записать:
   - `status` (`success`/`error`)
   - `httpStatus` или `errorMessage`
   - `finishedAt`, `durationMs`

### Финализация job

- `completed`, если обработаны все items и отмены не было
- `cancelled`, если была отмена
- `failed`, если случилась критическая внутренняя ошибка пайплайна

---

## Валидация и ошибки

### Валидация `POST /jobs`

- `urls` обязателен, массив, минимум 1 элемент
- каждый элемент — валидный URL с протоколом

### Ошибки API

- `400` — validation error
- `404` — job not found
- `500` — internal error

Формат придерживать совместимый с `docs/api-contract.md`.

---

## Технические требования реализации

- Включить global prefix `/api`.
- Включить `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`).
- Включить CORS (для dev).
- Логика хранения и процессинга без БД.
- Код должен собираться `npm run build`.

---

## Рекомендуемая структура файлов

- `src/jobs/jobs.controller.ts`
- `src/jobs/jobs.module.ts`
- `src/jobs/dto/create-job.dto.ts`
- `src/jobs/types/jobs.types.ts`
- `src/jobs/application/jobs.service.ts`
- `src/jobs/application/job-processor.service.ts`
- `src/jobs/ports/job-repository.port.ts`
- `src/jobs/ports/url-probe.port.ts`
- `src/jobs/infrastructure/in-memory-job.repository.ts`
- `src/jobs/infrastructure/http-url.probe.ts`

Разрешается адаптировать нейминг, но сохрани разделение по слоям.

---

## Пакеты и доустановка

Обязательно:
- `class-validator`
- `class-transformer`
- `uuid`

Опционально:
- `undici` (если нужен управляемый HTTP client)
- `p-limit` (если хочешь компактный limiter)

Не добавляй тяжелые внешние системы очередей/БД в рамках тестового.

---

## Пошаговый план реализации

1. Подготовить типы статусов и сущностей job/item.
2. Реализовать DTO и валидацию `POST /jobs`.
3. Реализовать repository contract и in-memory adapter на `Map`.
4. Реализовать `UrlProbe` adapter для `HEAD` с timeout/error handling.
5. Реализовать `JobProcessorService`:
   - async pool concurrency=5 на job
   - random delay 0..10s
   - корректная финализация статусов
6. Реализовать `JobsService` (create/list/get/cancel).
7. Реализовать контроллер и HTTP-коды.
8. Проверить сценарии из чеклиста.

---

## Чеклист приемки (Definition of Done)

- `POST /api/jobs` создает job и сразу возвращает `jobId`.
- Обработка URL идет в фоне.
- Одновременно в рамках одного job не более 5 `HEAD` запросов.
- `GET /api/jobs` возвращает агрегированную статистику.
- `GET /api/jobs/:id` возвращает детальные статусы items.
- `DELETE /api/jobs/:id` корректно отменяет не начатые items.
- Ошибки `400/404/500` возвращаются предсказуемо.
- `npm run build` проходит.

---

## Ограничения и roadmap (за пределами тестового)

Сейчас не реализуем:
- внешняя очередь (Kafka/Rabbit/SQS/BullMQ),
- outbox/inbox,
- heartbeat/reconciler cron,
- retry/backoff + DLQ.

Roadmap:
- заменить `InMemoryJobRepository` на persistent repository;
- заменить in-process dispatcher на message broker;
- добавить recovery для зависших `in_progress`;
- добавить наблюдаемость (metrics/tracing/log correlation).

---

## Требования к итоговому отчету агента

После выполнения агент должен предоставить:

1. Список измененных файлов.
2. Краткое объяснение архитектурных решений.
3. Что было установлено из пакетов.
4. Какие кейсы протестированы вручную.
5. Какие ограничения остались и почему.

