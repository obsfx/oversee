package domain

import (
	"errors"
	"fmt"
)

var (
	ErrNotFound           = errors.New("not found")
	ErrNoOpenSession      = errors.New("no open review session")
	ErrSessionNotFinished = errors.New("review session is not finished")
	ErrSessionFinished    = errors.New("review session is already finished")
	ErrStaleContent       = errors.New("the commented lines changed after they were loaded")
	ErrUnknownBranch      = errors.New("branch does not exist")

	ErrLanguageServerUnavailable = errors.New("language server can not be installed here")
	ErrLanguageServerBusy        = errors.New("language server is busy")
)

type ValidationError struct {
	Field  string
	Reason string
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("%s %s", e.Field, e.Reason)
}

func invalid(field, reason string) error {
	return ValidationError{Field: field, Reason: reason}
}
