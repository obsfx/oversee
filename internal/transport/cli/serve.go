package cli

import (
	"context"
	"fmt"
	"net"
	"os/exec"
	"runtime"
	"strconv"

	"github.com/spf13/cobra"

	"github.com/obsfx/oversee/internal/app"
)

const listenHost = "127.0.0.1"

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
				listener, err := net.Listen("tcp", net.JoinHostPort(listenHost, strconv.Itoa(port)))
				if err != nil {
					return err
				}
				address := fmt.Sprintf("http://localhost:%d", listener.Addr().(*net.TCPAddr).Port)
				fmt.Fprintf(cmd.OutOrStdout(), "oversee serving %s at %s\n", application.Workspace.RepoRoot, address)
				if open {
					openBrowser(address)
				}
				return application.Server(dev).Serve(ctx, listener)
			})
		},
	}
	command.Flags().IntVarP(&port, "port", "p", 0, "port to listen on, 0 picks an available one")
	command.Flags().BoolVar(&open, "open", false, "open the UI in the default browser")
	command.Flags().BoolVar(&dev, "dev", false, "accept websocket connections from local dev servers")
	return command
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
