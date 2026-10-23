package git

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
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
	command, stderr := r.command(ctx, nil, args)
	output, err := command.Output()
	if err != nil {
		return nil, commandFailure(args, err, stderr)
	}
	if output == nil {
		return []byte{}, nil
	}
	return output, nil
}

func (r Runner) Stream(ctx context.Context, input []byte, read func(*bufio.Reader), args ...string) error {
	command, stderr := r.command(ctx, input, args)
	stdout, err := command.StdoutPipe()
	if err != nil {
		return err
	}
	if err := command.Start(); err != nil {
		return err
	}
	read(bufio.NewReader(stdout))
	_, drainErr := io.Copy(io.Discard, stdout)
	if err := command.Wait(); err != nil {
		return commandFailure(args, err, stderr)
	}
	return drainErr
}

func (r Runner) command(ctx context.Context, input []byte, args []string) (*exec.Cmd, *bytes.Buffer) {
	command := exec.CommandContext(ctx, "git", args...)
	command.Dir = r.dir
	if input != nil {
		command.Stdin = bytes.NewReader(input)
	}
	stderr := &bytes.Buffer{}
	command.Stderr = stderr
	return command, stderr
}

func commandFailure(args []string, err error, stderr *bytes.Buffer) error {
	if exitErr, ok := errors.AsType[*exec.ExitError](err); ok {
		return &CommandError{Args: args, ExitCode: exitErr.ExitCode(), Stderr: strings.TrimSpace(stderr.String())}
	}
	return err
}
