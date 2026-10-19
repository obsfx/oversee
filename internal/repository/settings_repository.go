package repository

import (
	"context"
	"time"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/storage/sqlite/sqldb"
)

type SettingsRepository struct {
	queries *sqldb.Queries
}

func (r SettingsRepository) All(ctx context.Context) ([]domain.Setting, error) {
	rows, err := r.queries.ListSettings(ctx)
	if err != nil {
		return nil, err
	}
	settings := make([]domain.Setting, 0, len(rows))
	for _, row := range rows {
		settings = append(settings, domain.Setting{Key: row.Key, Value: []byte(row.Value)})
	}
	return settings, nil
}

func (r SettingsRepository) Put(ctx context.Context, setting domain.Setting, at time.Time) error {
	return r.queries.UpsertSetting(ctx, sqldb.UpsertSettingParams{
		Key:       setting.Key,
		Value:     string(setting.Value),
		UpdatedAt: millis(at),
	})
}
