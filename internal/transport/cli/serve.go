package cli

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"os/exec"
	"runtime"
	"strconv"

	"github.com/spf13/cobra"

	"github.com/obsfx/oversee/internal/app"
)

const (
	listenHost  = "127.0.0.1"
	defaultPort = 6999
)

func serveCommand(opts *options) *cobra.Command {
	var port int
	var open bool
	var dev bool
	command := &cobra.Command{
		Use:   "serve",
		Short: "Serve the review UI and backend on a local port",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return opts.withApp(cmd, func(ctx context.Context, application *app.App) error {
				server, err := application.Server(dev)
				if err != nil {
					return err
				}
				listener, err := listen(port, cmd.ErrOrStderr())
				if err != nil {
					return err
				}
				address := fmt.Sprintf("http://localhost:%d", listenerPort(listener))
				fmt.Fprintf(cmd.OutOrStdout(), "oversee serving %s at %s\n", application.Workspace.RepoRoot, address)
				if open {
					openBrowser(address)
				}
				return server.Serve(ctx, listener)
			})
		},
	}
	command.Flags().IntVarP(&port, "port", "p", defaultPort, "port to listen on, falls back to an available one when busy, 0 picks any")
	command.Flags().BoolVar(&open, "open", false, "open the UI in the default browser")
	command.Flags().BoolVar(&dev, "dev", false, "accept websocket connections from local dev servers")
	return command
}

func listen(port int, notices io.Writer) (net.Listener, error) {
	listener, err := net.Listen("tcp", listenAddress(port))
	if err == nil || port == 0 {
		return listener, err
	}
	fallback, fallbackErr := net.Listen("tcp", listenAddress(0))
	if fallbackErr != nil {
		return nil, errors.Join(err, fallbackErr)
	}
	fmt.Fprintf(notices, "port %d is unavailable, using port %d\n", port, listenerPort(fallback))
	return fallback, nil
}

func listenAddress(port int) string {
	return net.JoinHostPort(listenHost, strconv.Itoa(port))
}

func listenerPort(listener net.Listener) int {
	return listener.Addr().(*net.TCPAddr).Port
}

func openBrowser(address string) {
	var command *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		command = exec.Command("open", address)
	case "windows":
		command = exec.Command("rundll32", "url.dll,FileProtocolHandler", address)
	default:
		command = exec.Command("xdg-open", address)
	}
	_ = command.Start()
}
