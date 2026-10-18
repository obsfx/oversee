package git

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
)

type CommandError struct {
	Args     []string
	ExitCode int
	Stderr   string
}

func (e *CommandError) Error() string {
	return fmt.Sprintf("git %s: exit status %d: %s", strings.Join(e.Args, " "), e.ExitCode, e.Stderr)
}

type Runner struct {
	dir string
}

func NewRunner(dir string) Runner {
	return Runner{dir: dir}
}

func (r Runner) Text(ctx context.Context, args ...string) (string, error) {
	output, err := r.Bytes(ctx, args...)
	return strings.TrimSpace(string(output)), err
}

func (r Runner) Bytes(ctx context.Context, args ...string) ([]byte, error) {
	command := exec.CommandContext(ctx, "git", args...)
	command.Dir = r.dir
	var stderr bytes.Buffer
	command.Stderr = &stderr
	output, err := command.Output()
	if exitErr, ok := errors.AsType[*exec.ExitError](err); ok {
		return nil, &CommandError{Args: args, ExitCode: exitErr.ExitCode(), Stderr: strings.TrimSpace(stderr.String())}
	}
	if err != nil {
		return nil, err
	}
	if output == nil {
		return []byte{}, nil
	}
	return output, nil
}
