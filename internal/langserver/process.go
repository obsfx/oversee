package langserver

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"runtime"
	"strconv"
)

type Process struct {
	command *exec.Cmd
	stdin   io.WriteCloser
	stdout  *io.PipeReader
	done    chan struct{}
	err     error
}

func (i Installation) Start(ctx context.Context, toolchain Toolchain, args []string, dir string) (*Process, error) {
	program, prefix, err := i.Command(toolchain)
	if err != nil {
		return nil, err
	}
	command := exec.CommandContext(ctx, program, append(prefix, args...)...)
	command.Dir = dir
	command.WaitDelay = commandGrace
	command.Cancel = func() error {
		return killTree(command.Process)
	}
	stdin, err := command.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, output := io.Pipe()
	command.Stdout = output
	stderr := &outputTail{limit: outputLimit}
	command.Stderr = stderr
	if err := command.Start(); err != nil {
		return nil, fmt.Errorf("start %s: %w", i.ID, err)
	}
	process := &Process{command: command, stdin: stdin, stdout: stdout, done: make(chan struct{})}
	go func() {
		process.err = exitError(i.ID, command.Wait(), stderr.String())
		close(process.done)
		output.CloseWithError(io.EOF)
	}()
	return process, nil
}

func (p *Process) Read(data []byte) (int, error) {
	return p.stdout.Read(data)
}

func (p *Process) Write(data []byte) (int, error) {
	return p.stdin.Write(data)
}

func (p *Process) Close() error {
	return p.stdin.Close()
}

func (p *Process) Done() <-chan struct{} {
	return p.done
}

func (p *Process) Err() error {
	select {
	case <-p.done:
		return p.err
	default:
		return nil
	}
}

func (p *Process) Kill() {
	if p.command.Process != nil {
		killTree(p.command.Process)
	}
}

func killTree(process *os.Process) error {
	if runtime.GOOS == "windows" {
		return exec.Command("taskkill", "/T", "/F", "/PID", strconv.Itoa(process.Pid)).Run()
	}
	return process.Kill()
}

func exitError(id string, waitErr error, stderr string) error {
	if waitErr == nil {
		return fmt.Errorf("%s exited\n%s", id, stderr)
	}
	return fmt.Errorf("%s exited: %w\n%s", id, waitErr, stderr)
}
