package domain

import "fmt"

const (
	maxSettingsPerPatch   = 64
	maxSettingKeyLength   = 64
	maxSettingValueLength = 4096
)

type Setting struct {
	Key   string
	Value []byte
}

type SettingsPatch []Setting

func (p SettingsPatch) Validate() error {
	if len(p) > maxSettingsPerPatch {
		return invalid("settings", fmt.Sprintf("must have at most %d keys", maxSettingsPerPatch))
	}
	for _, setting := range p {
		if setting.Key == "" || len(setting.Key) > maxSettingKeyLength {
			return invalid("settings", fmt.Sprintf("keys must be 1 to %d characters", maxSettingKeyLength))
		}
		if len(setting.Value) > maxSettingValueLength {
			return invalid(setting.Key, fmt.Sprintf("must be at most %d bytes", maxSettingValueLength))
		}
	}
	return nil
}
