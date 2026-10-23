package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"

	"github.com/obsfx/oversee/internal/noticesgen"
)

const embeddedModules = "internal/notices/modules.json"

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "notices-gen:", err)
		os.Exit(1)
	}
}

func run() error {
	out := flag.String("out", embeddedModules, "path of the generated module notices")
	check := flag.Bool("check", false, "fail when the file at -out is not up to date instead of writing it")
	flag.Parse()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	modules, err := noticesgen.Collect(ctx, "")
	if err != nil {
		return err
	}
	content, err := noticesgen.Encode(modules)
	if err != nil {
		return err
	}
	if *check {
		return noticesgen.Check(*out, content)
	}
	return os.WriteFile(*out, content, 0o644)
}
