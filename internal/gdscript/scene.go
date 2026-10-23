package gdscript

import (
	"regexp"
	"strconv"
	"strings"
)

const (
	SceneExtension = ".tscn"
	sceneRoot      = "."
	nodePathJoiner = "/"
)

var (
	sceneHeader        = regexp.MustCompile(`^\[(\w+)(.*)\]$`)
	sceneAttribute     = regexp.MustCompile(`(\w+)=("(?:[^"\\]|\\.)*"|[^\s\]]+)`)
	externalResourceID = regexp.MustCompile(`ExtResource\(\s*"?([^")\s]+)"?\s*\)`)
	instanceResourceID = regexp.MustCompile(`instance=ExtResource\(\s*"?([^")\s]+)"?\s*\)`)
)

type SceneNode struct {
	Name     string
	Script   string
	Instance string
}

type SceneConnection struct {
	Signal string
	From   string
	To     string
	Method string
	Line   int
}

type Scene struct {
	Nodes       map[string]SceneNode
	Connections []SceneConnection
}

func (s Scene) Node(nodePath string) (SceneNode, bool) {
	node, found := s.Nodes[nodePath]
	return node, found
}

func (s Scene) NodeName(nodePath string) string {
	if node, found := s.Nodes[nodePath]; found {
		return node.Name
	}
	return nodePath
}

func ParseScene(content []byte) Scene {
	scene := Scene{Nodes: map[string]SceneNode{}}
	resources := map[string]string{}
	current := ""
	number := 0
	for line := range strings.Lines(string(content)) {
		number++
		line = strings.TrimSpace(line)
		if header := sceneHeader.FindStringSubmatch(line); header != nil {
			attributes := sceneAttributes(header[2])
			current = ""
			switch header[1] {
			case "ext_resource":
				resources[attributes["id"]] = attributes["path"]
			case "node":
				current = nodePath(attributes)
				if current == "" {
					continue
				}
				node := SceneNode{Name: attributes["name"]}
				if id := instanceResourceID.FindStringSubmatch(header[2]); id != nil {
					node.Instance = resources[id[1]]
				}
				scene.Nodes[current] = node
			case "connection":
				scene.Connections = append(scene.Connections, SceneConnection{
					Signal: attributes["signal"],
					From:   attributes["from"],
					To:     attributes["to"],
					Method: attributes["method"],
					Line:   number,
				})
			}
			continue
		}
		key, value, found := strings.Cut(line, "=")
		if current == "" || !found || strings.TrimSpace(key) != "script" {
			continue
		}
		if id := externalResourceID.FindStringSubmatch(value); id != nil {
			node := scene.Nodes[current]
			node.Script = resources[id[1]]
			scene.Nodes[current] = node
		}
	}
	return scene
}

func nodePath(attributes map[string]string) string {
	name := attributes["name"]
	if name == "" {
		return ""
	}
	parent, hasParent := attributes["parent"]
	if !hasParent {
		return sceneRoot
	}
	if parent == sceneRoot {
		return name
	}
	return parent + nodePathJoiner + name
}

func sceneAttributes(text string) map[string]string {
	attributes := map[string]string{}
	for _, match := range sceneAttribute.FindAllStringSubmatch(text, -1) {
		value := match[2]
		if unquoted, err := strconv.Unquote(value); err == nil {
			value = unquoted
		}
		attributes[match[1]] = value
	}
	return attributes
}
