package service

import (
	"context"

	"github.com/obsfx/oversee/internal/domain"
	"github.com/obsfx/oversee/internal/repository"
)

type SettingsService struct {
	tx      Transactor
	reads   repository.Repositories
	runtime Runtime
}

func NewSettingsService(tx Transactor, reads repository.Repositories, runtime Runtime) *SettingsService {
	return &SettingsService{tx: tx, reads: reads, runtime: runtime}
}

func (s *SettingsService) All(ctx context.Context) ([]domain.Setting, error) {
	return s.reads.Settings.All(ctx)
}

func (s *SettingsService) Update(ctx context.Context, patch domain.SettingsPatch) error {
	if err := patch.Validate(); err != nil {
		return err
	}
	if len(patch) == 0 {
		return nil
	}
	now := s.runtime.Now()
	return s.tx.Within(ctx, func(repos repository.Repositories) error {
		for _, setting := range patch {
			if err := repos.Settings.Put(ctx, setting, now); err != nil {
				return err
			}
		}
		return nil
	})
}
