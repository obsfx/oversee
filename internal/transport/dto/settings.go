package dto

import (
	"encoding/json/jsontext"
	"maps"
	"slices"

	"github.com/obsfx/oversee/internal/domain"
)

type Settings map[string]jsontext.Value

func SettingsOf(settings []domain.Setting) Settings {
	mapped := make(Settings, len(settings))
	for _, setting := range settings {
		mapped[setting.Key] = jsontext.Value(setting.Value)
	}
	return mapped
}

func (s Settings) ToDomain() domain.SettingsPatch {
	patch := make(domain.SettingsPatch, 0, len(s))
	for _, key := range slices.Sorted(maps.Keys(s)) {
		patch = append(patch, domain.Setting{Key: key, Value: s[key]})
	}
	return patch
}
