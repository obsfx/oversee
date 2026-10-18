-- name: ListSessionComments :many
SELECT id, session_id, file_path, side, start_line, end_line, end_side, body, snapshot, created_at, updated_at
FROM comments
WHERE session_id = ?
ORDER BY file_path, start_line, created_at;

-- name: GetComment :one
SELECT id, session_id, file_path, side, start_line, end_line, end_side, body, snapshot, created_at, updated_at
FROM comments
WHERE id = ?;

-- name: InsertComment :exec
INSERT INTO comments (id, session_id, file_path, side, start_line, end_line, end_side, body, snapshot, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateCommentBody :execrows
UPDATE comments SET body = ?, updated_at = ? WHERE id = ?;

-- name: DeleteComment :execrows
DELETE FROM comments WHERE id = ?;
