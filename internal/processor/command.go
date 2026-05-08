package processor

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

type CommandRunner struct {
	Timeout time.Duration
}

type CommandResult struct {
	Stdout string
	Stderr string
}

func (r CommandRunner) Run(ctx context.Context, name string, args ...string) (CommandResult, error) {
	return r.RunWithInput(ctx, "", name, args...)
}

func (r CommandRunner) RunWithInput(ctx context.Context, input, name string, args ...string) (CommandResult, error) {
	timeout := r.Timeout
	if timeout <= 0 {
		timeout = 90 * time.Second
	}

	commandCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	cmd := exec.CommandContext(commandCtx, name, args...)
	if input != "" {
		cmd.Stdin = strings.NewReader(input)
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if commandCtx.Err() != nil {
			return CommandResult{}, fmt.Errorf("%s timed out after %s: %w", name, timeout, commandCtx.Err())
		}
		return CommandResult{Stdout: stdout.String(), Stderr: stderr.String()}, fmt.Errorf("%s failed: %w: %s", name, err, stderr.String())
	}

	return CommandResult{Stdout: stdout.String(), Stderr: stderr.String()}, nil
}
