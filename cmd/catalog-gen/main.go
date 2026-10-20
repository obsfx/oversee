package main

import (
	"context"
	"encoding/json/jsontext"
	"encoding/json/v2"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"time"

	"github.com/obsfx/oversee/internal/catalog"
	"github.com/obsfx/oversee/internal/cataloggen"
)

const embeddedCatalog = "internal/catalog/catalog.json"

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "catalog-gen:", err)
		os.Exit(1)
	}
}

func run() error {
	out := flag.String("out", embeddedCatalog, "path of the generated catalog")
	previous := flag.String("previous", embeddedCatalog, "path of the previous catalog, reused for checksums and as a fallback (empty to skip)")
	summary := flag.String("summary", "", "file to append the coverage summary to (stdout when empty)")
	flag.Parse()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	github := cataloggen.NewGitHub(&http.Client{Timeout: 10 * time.Minute}, os.Getenv("GITHUB_TOKEN"))
	last, err := loadPrevious(*previous)
	if err != nil {
		return err
	}
	result, report, err := cataloggen.NewGenerator(github, last, log.New(os.Stderr, "", log.Ltime)).Generate(ctx)
	if writeErr := writeSummary(report, *summary); writeErr != nil {
		return errors.Join(err, writeErr)
	}
	if err != nil {
		return err
	}
	return writeCatalog(result, *out)
}

func loadPrevious(path string) (catalog.Catalog, error) {
	if path == "" {
		return catalog.Catalog{}, nil
	}
	content, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return catalog.Catalog{}, nil
	}
	if err != nil {
		return catalog.Catalog{}, fmt.Errorf("previous catalog: %w", err)
	}
	var last catalog.Catalog
	if err := json.Unmarshal(content, &last); err != nil || last.SchemaVersion != catalog.SchemaVersion {
		return catalog.Catalog{}, nil
	}
	return last, nil
}

func writeSummary(report cataloggen.Report, path string) error {
	if path == "" {
		_, err := report.WriteTo(os.Stdout)
		return err
	}
	file, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	_, err = report.WriteTo(file)
	return errors.Join(err, file.Close())
}

func writeCatalog(result catalog.Catalog, path string) error {
	file, err := os.CreateTemp(filepath.Dir(path), "catalog-*.json")
	if err != nil {
		return err
	}
	encodeErr := json.MarshalWrite(file, result, json.Deterministic(true), jsontext.WithIndent("  "))
	if err := errors.Join(encodeErr, file.Close()); err != nil {
		os.Remove(file.Name())
		return err
	}
	return os.Rename(file.Name(), path)
}
