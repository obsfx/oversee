-- name: ListSessionReplies :many
SELECT r.id, r.comment_id, r.author, r.body, r.created_at
FROM comment_replies r
JOIN comments c ON c.id = r.comment_id
WHERE c.session_id = ?
ORDER BY r.created_at;

-- name: InsertReply :exec
INSERT INTO comment_replies (id, comment_id, author, body, created_at) VALUES (?, ?, ?, ?, ?);
