package main

import (
	"os"

	"github.com/obsfx/oversee/internal/transport/cli"
)

var version = "dev"

func main() {
	os.Exit(cli.Execute(version))
}
