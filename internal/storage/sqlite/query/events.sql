-- name: InsertEvent :exec
INSERT INTO events (kind, payload, created_at) VALUES (?, ?, ?);

-- name: ListEventsAfter :many
SELECT id, kind, payload, created_at FROM events WHERE id > ? ORDER BY id;

-- name: LatestEventID :one
SELECT CAST(COALESCE(MAX(id), 0) AS INTEGER) AS latest_id FROM events;
