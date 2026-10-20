package cataloggen

import (
	"fmt"
	"maps"
	"regexp"
	"slices"
	"strconv"
	"strings"
)

var templateIdentifier = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

type TemplateScope map[string]any

func (s TemplateScope) Render(text string) (string, error) {
	var rendered strings.Builder
	rest := text
	for {
		before, after, found := strings.Cut(rest, "{{")
		rendered.WriteString(before)
		if !found {
			return rendered.String(), nil
		}
		expression, remainder, closed := strings.Cut(after, "}}")
		if !closed {
			return "", fmt.Errorf("template %q has an unclosed expression", text)
		}
		value, err := s.evaluate(expression)
		if err != nil {
			return "", fmt.Errorf("template %q: %w", text, err)
		}
		rendered.WriteString(value)
		rest = remainder
	}
}

func (s TemplateScope) RenderValue(value any) (any, error) {
	switch typed := value.(type) {
	case string:
		return s.Render(typed)
	case []any:
		rendered := make([]any, 0, len(typed))
		for _, item := range typed {
			value, err := s.RenderValue(item)
			if err != nil {
				return nil, err
			}
			rendered = append(rendered, value)
		}
		return rendered, nil
	case map[string]any:
		rendered := make(map[string]any, len(typed))
		for _, key := range slices.Sorted(maps.Keys(typed)) {
			value, err := s.RenderValue(typed[key])
			if err != nil {
				return nil, err
			}
			rendered[key] = value
		}
		return rendered, nil
	default:
		return value, nil
	}
}

func (s TemplateScope) evaluate(expression string) (string, error) {
	path, filters, _ := strings.Cut(expression, "|")
	value, err := s.lookup(strings.TrimSpace(path))
	if err != nil {
		return "", err
	}
	if filters == "" {
		return value, nil
	}
	for filter := range strings.SplitSeq(filters, "|") {
		value, err = applyFilter(value, strings.TrimSpace(filter))
		if err != nil {
			return "", err
		}
	}
	return value, nil
}

func (s TemplateScope) lookup(path string) (string, error) {
	var current any = map[string]any(s)
	for segment := range strings.SplitSeq(path, ".") {
		if !templateIdentifier.MatchString(segment) {
			return "", fmt.Errorf("invalid path %q", path)
		}
		fields, ok := current.(map[string]any)
		if !ok {
			return "", fmt.Errorf("%q is not an object at %q", path, segment)
		}
		current, ok = fields[segment]
		if !ok {
			return "", nil
		}
	}
	text, ok := current.(string)
	if !ok {
		return "", fmt.Errorf("%q is not a string", path)
	}
	return text, nil
}

func applyFilter(value, filter string) (string, error) {
	name, argument, _ := strings.Cut(filter, " ")
	switch name {
	case "strip_prefix":
		prefix, err := strconv.Unquote(strings.TrimSpace(argument))
		if err != nil {
			return "", fmt.Errorf("strip_prefix argument %q: %w", argument, err)
		}
		return strings.TrimPrefix(value, prefix), nil
	default:
		return "", fmt.Errorf("unknown filter %q", name)
	}
}
