-- name: FindOpenSession :one
SELECT s.id, s.source, s.target, s.status, s.created_at, s.finished_at, COUNT(c.id) AS comment_count
FROM review_sessions s
LEFT JOIN comments c ON c.session_id = s.id
WHERE s.source = ? AND s.target = ? AND s.finished_at IS NULL
GROUP BY s.id;

-- name: GetSession :one
SELECT s.id, s.source, s.target, s.status, s.created_at, s.finished_at, COUNT(c.id) AS comment_count
FROM review_sessions s
LEFT JOIN comments c ON c.session_id = s.id
WHERE s.id = ?
GROUP BY s.id;

-- name: ListFinishedSessionsByComparison :many
SELECT s.id, s.source, s.target, s.status, s.created_at, s.finished_at, COUNT(c.id) AS comment_count
FROM review_sessions s
LEFT JOIN comments c ON c.session_id = s.id
WHERE s.source = ? AND s.target = ? AND s.finished_at IS NOT NULL
GROUP BY s.id
ORDER BY s.finished_at DESC;

-- name: ListFinishedSessions :many
SELECT s.id, s.source, s.target, s.status, s.created_at, s.finished_at, COUNT(c.id) AS comment_count
FROM review_sessions s
LEFT JOIN comments c ON c.session_id = s.id
WHERE s.finished_at IS NOT NULL
GROUP BY s.id
ORDER BY s.finished_at DESC, s.id
LIMIT ? OFFSET ?;

-- name: CountFinishedSessions :one
SELECT COUNT(*) FROM review_sessions WHERE finished_at IS NOT NULL;

-- name: InsertSession :exec
INSERT INTO review_sessions (id, source, target, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?);

-- name: UpdateSessionFinished :exec
UPDATE review_sessions SET finished_at = ?, status = ?, updated_at = ? WHERE id = ?;

-- name: UpdateSessionStatus :exec
UPDATE review_sessions SET status = ?, updated_at = ? WHERE id = ?;
