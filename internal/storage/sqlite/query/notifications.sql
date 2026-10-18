-- name: InsertNotification :one
INSERT INTO notifications (kind, session_id, comment_id, status, created_at)
VALUES (?, ?, ?, ?, ?)
RETURNING id;

-- name: ListNotifications :many
SELECT n.id, n.kind, n.session_id, s.source, s.target, n.status, n.comment_id, c.file_path, c.start_line, n.created_at, n.read_at
FROM notifications n
JOIN review_sessions s ON s.id = n.session_id
LEFT JOIN comments c ON c.id = n.comment_id
ORDER BY n.id DESC;

-- name: GetNotification :one
SELECT n.id, n.kind, n.session_id, s.source, s.target, n.status, n.comment_id, c.file_path, c.start_line, n.created_at, n.read_at
FROM notifications n
JOIN review_sessions s ON s.id = n.session_id
LEFT JOIN comments c ON c.id = n.comment_id
WHERE n.id = ?;

-- name: MarkNotificationsRead :exec
UPDATE notifications SET read_at = ? WHERE read_at IS NULL AND id IN (sqlc.slice('ids'));
