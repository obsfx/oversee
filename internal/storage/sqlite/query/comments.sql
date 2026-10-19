-- name: ListSessionComments :many
SELECT id, session_id, file_path, side, start_line, end_line, end_side, body, snapshot, created_at, updated_at, outdated_at
FROM comments
WHERE session_id = ?
ORDER BY file_path, start_line, created_at;

-- name: GetComment :one
SELECT id, session_id, file_path, side, start_line, end_line, end_side, body, snapshot, created_at, updated_at, outdated_at
FROM comments
WHERE id = ?;

-- name: InsertComment :exec
INSERT INTO comments (id, session_id, file_path, side, start_line, end_line, end_side, body, snapshot, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateCommentBody :execrows
UPDATE comments SET body = ?, updated_at = ? WHERE id = ?;

-- name: DeleteComment :execrows
DELETE FROM comments WHERE id = ?;

-- name: MarkCommentOutdated :execrows
UPDATE comments SET outdated_at = ?
WHERE comments.id = ? AND comments.outdated_at IS NULL
  AND EXISTS (SELECT 1 FROM review_sessions s WHERE s.id = comments.session_id AND s.finished_at IS NULL);

-- name: MoveComment :execrows
UPDATE comments SET start_line = sqlc.arg(start_line), end_line = sqlc.arg(end_line), snapshot = sqlc.arg(snapshot)
WHERE comments.id = sqlc.arg(id) AND comments.start_line = sqlc.arg(from_start_line) AND comments.end_line = sqlc.arg(from_end_line) AND comments.outdated_at IS NULL
  AND EXISTS (SELECT 1 FROM review_sessions s WHERE s.id = comments.session_id AND s.finished_at IS NULL);
