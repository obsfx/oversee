package notices

import (
	_ "embed"
	"encoding/json/v2"
	"fmt"
	"runtime"
	"strings"
	"sync"
)

//go:embed modules.json
var modulesJSON []byte

//go:embed go/LICENSE
var goLicense string

//go:embed go/PATENTS
var goPatents string

type Notice struct {
	Project string
	Version string
	License string
}

func (n Notice) Text() string {
	return n.Project + " " + n.Version + "\n\n" + n.License
}

type Module struct {
	Path     string    `json:"path"`
	Version  string    `json:"version"`
	Licenses []License `json:"licenses"`
}

type License struct {
	File string `json:"file"`
	Text string `json:"text"`
}

func (m Module) Notice() Notice {
	texts := make([]string, 0, len(m.Licenses))
	for _, license := range m.Licenses {
		texts = append(texts, license.Text)
	}
	return Notice{Project: m.Path, Version: m.Version, License: strings.Join(texts, "\n")}
}

var Modules = sync.OnceValues(func() ([]Module, error) {
	var modules []Module
	if err := json.Unmarshal(modulesJSON, &modules); err != nil {
		return nil, fmt.Errorf("decode embedded module notices: %w", err)
	}
	return modules, nil
})

func Compiled() ([]Notice, error) {
	modules, err := Modules()
	if err != nil {
		return nil, err
	}
	compiled := []Notice{{Project: "go", Version: runtime.Version(), License: goLicense + "\n" + goPatents}}
	for _, module := range modules {
		compiled = append(compiled, module.Notice())
	}
	return compiled, nil
}
