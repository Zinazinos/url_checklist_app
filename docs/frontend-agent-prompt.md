# Frontend Agent Prompt (React + TypeScript + Zustand)

Скопируй текст ниже целиком и передай агенту-фронтендеру.

---

## Роль и цель

Ты Senior Frontend Engineer в проекте `Async URL Checker`.

Твоя цель: реализовать production-like frontend для тестового задания на `React + TypeScript + Zustand`, строго по API-контракту, с корректным polling, управлением race conditions и чистой архитектурой (компоненты, API-слой, глобальный state).

Ты работаешь только во фронтенд-части проекта:

- `frontend/urllist_checking_web`

Backend не изменяй.

---

## Контекст проекта

Это fullstack-сервис асинхронной проверки URL.

Пользователь:
1. Вводит список URL (каждый с новой строки).
2. Запускает задание.
3. Видит список заданий.
4. Выбирает активное задание.
5. Видит детали обработки URL и прогресс.
6. Может отменить задание.

---

## ТЗ (обязательный фронтенд-функционал)

### 1) Форма создания задания

- `textarea`, где каждый URL с новой строки.
- Кнопка: **"Запустить проверку"**.
- По submit:
  - очистка/нормализация input (trim, фильтр пустых строк),
  - `POST /api/jobs`,
  - полученный `jobId` устанавливается как активный.

### 2) Список заданий

- Запрос: `GET /api/jobs`.
- Показать: `id`, `createdAt`, `status`, агрегированную статистику.
- Возможность выбрать любое задание активным.

### 3) Детальная информация по активному заданию

- Запрос: `GET /api/jobs/:id`.
- Показать:
  - общий статус job,
  - прогресс в формате `X из Y обработано`,
  - список URL: статус, HTTP-код, ошибка (если есть), тайминги.

### 4) Опрос и отмена

- Polling активного job (`GET /api/jobs/:id`) до terminal-статуса.
- При смене активного job polling старого корректно останавливается.
- Ответы старого job не должны перезаписывать state нового.
- Кнопка отмены вызывает `DELETE /api/jobs/:id`.

---

## Архитектурные требования от архитектора

### Общие принципы

- TypeScript strict typing.
- Никакой бизнес-логики API внутри React-компонентов.
- Компоненты должны быть “тонкими”, логика — в store и сервисах.
- UI-состояния обязательны: `loading`, `empty`, `error`, `success`.

### Слои

1. `src/api`  
   HTTP-клиент и typed-функции API.

2. `src/store`  
   Zustand store + async actions, вся оркестрация polling и race-safe механика.

3. `src/components`  
   Переиспользуемые UI-компоненты.

4. `src/features/jobs`  
   (рекомендуется) feature-ориентированные контейнеры:
   - `CreateJobForm`
   - `JobsList`
   - `ActiveJobPanel`

### Директории (рекомендуемый каркас)

- `src/api/client.ts`
- `src/api/jobs.api.ts`
- `src/types/jobs.ts`
- `src/store/jobs.store.ts`
- `src/features/jobs/components/*`
- `src/features/jobs/utils/*`
- `src/App.tsx`

---

## API-контракт (используй строго)

Источник истины: `docs/api-contract.md`

### `POST /api/jobs`

Request:

```json
{
  "urls": ["https://example.com", "https://google.com"]
}
```

Response:

```json
{
  "jobId": "uuid"
}
```

### `GET /api/jobs`

Response:

```json
[
  {
    "id": "uuid",
    "createdAt": "ISO",
    "status": "pending | in_progress | completed | cancelled | failed",
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

### `GET /api/jobs/:id`

Response:

```json
{
  "id": "uuid",
  "createdAt": "ISO",
  "status": "pending | in_progress | completed | cancelled | failed",
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
      "status": "pending | in_progress | success | error | cancelled",
      "httpStatus": 200,
      "errorMessage": "optional",
      "startedAt": "ISO",
      "finishedAt": "ISO",
      "durationMs": 1200
    }
  ]
}
```

### `DELETE /api/jobs/:id`

Response:

```json
{
  "id": "uuid",
  "status": "cancelled"
}
```

---

## Политика polling и race-condition (обязательно)

Реализуй безопасный механизм:

- В store хранить `activeJobId` и `pollingSessionId`.
- При старте polling увеличивать `pollingSessionId`.
- Каждый async poll-запрос запоминает локальный `sessionId`.
- Перед записью ответа в store проверять:
  - `sessionId` все еще актуален,
  - `jobId` ответа совпадает с `activeJobId`.
- При смене активного job:
  - остановить текущий polling-таймер,
  - начать новый polling для нового job.
- Polling interval: `1500ms` (допустимо `1000-2000ms`).
- Polling остановить при terminal status: `completed`, `cancelled`, `failed`.

---

## Набор статусов для UI

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

Покажи статусы цветом/бейджами (минимально, без тяжелой дизайн-системы).

---

## Пакеты и доустановка

Установить:

- `zustand`

Опционально (если ускорит качество):

- `clsx` (если нужна удобная сборка классов)
- `date-fns` (форматирование даты/времени)

Не добавляй тяжелые UI-фреймворки (MUI/Antd) — это лишнее для тестового.

---

## Технические требования к реализации

- Использовать `fetch` через единый API client.
- Вынести `API_BASE_URL` в конфиг (env), с дефолтом `/api`.
- Обработать API-ошибки и сетевые ошибки.
- Для списка job добавить refresh (авто раз в `5-10s` или manual-кнопка).
- Для активного job добавить явный индикатор загрузки.
- Не ломать текущий Docker/Nginx сценарий (`/api` проксируется backend).

---

## Шаги реализации (пошагово)

1. Описать TypeScript-типы DTO в `src/types/jobs.ts`.
2. Реализовать API-слой `src/api/jobs.api.ts`.
3. Реализовать Zustand-store:
   - состояние,
   - async actions,
   - polling lifecycle,
   - race-safe guard.
4. Сделать компоненты:
   - форма запуска,
   - список job,
   - детали активного job,
   - кнопка отмены.
5. Интегрировать в `App.tsx`.
6. Проверить UX-сценарии (см. чеклист ниже).
7. Прогнать lint/build и устранить ошибки.

---

## Чеклист приемки (Definition of Done)

- Создание job работает, `jobId` становится активным.
- Список job отображается и обновляется.
- Детали активного job показывают прогресс и items.
- Polling корректно останавливается при terminal status.
- При быстром переключении активных job нет “перетирания” state старым ответом.
- Отмена job вызывает API и корректно отражается в UI.
- Ошибки API/сети отображаются пользователю.
- `npm run build` проходит успешно.

---

## Ограничения и TODO вне рамок тестового

Сейчас не реализуем:

- WebSocket/SSE вместо polling.
- Persistence пользовательских фильтров и истории в localStorage.
- Продвинутую виртуализацию длинных списков.

В roadmap:

- SSE/WebSocket для live updates.
- Рефетч-политики/кеширование через TanStack Query (если потребуется масштаб).
- E2E тесты (Playwright) и интеграционные моки API.

---

## Требования к итоговому отчету агента

После выполнения агент должен предоставить:

1. Список измененных файлов.
2. Краткое объяснение архитектурных решений.
3. Что установлено из пакетов.
4. Какие сценарии протестированы вручную.
5. Команды для локального запуска фронта.

