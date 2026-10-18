package sqlite

import (
	"context"
	"database/sql"
)

type ChangeDetector struct {
	conn        *sql.Conn
	lastVersion int64
}

func (db *DB) NewChangeDetector(ctx context.Context) (*ChangeDetector, error) {
	conn, err := db.Conn(ctx)
	if err != nil {
		return nil, err
	}
	return &ChangeDetector{conn: conn}, nil
}

func (d *ChangeDetector) Changed(ctx context.Context) (bool, error) {
	var version int64
	if err := d.conn.QueryRowContext(ctx, "PRAGMA data_version").Scan(&version); err != nil {
		return false, err
	}
	if version == d.lastVersion {
		return false, nil
	}
	d.lastVersion = version
	return true, nil
}

func (d *ChangeDetector) Close() error {
	return d.conn.Close()
}
