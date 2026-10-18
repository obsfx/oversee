package git

import (
	"strconv"
	"strings"

	"github.com/obsfx/oversee/internal/domain"
)

type lineOutput string

func (o lineOutput) Lines() []string {
	lines := []string{}
	for line := range strings.SplitSeq(string(o), "\n") {
		if line != "" {
			lines = append(lines, line)
		}
	}
	return lines
}

type remoteRefOutput string

func (o remoteRefOutput) Branches() []string {
	branches := []string{}
	for _, line := range lineOutput(o).Lines() {
		name, symref, _ := strings.Cut(line, "\t")
		if symref == "" {
			branches = append(branches, name)
		}
	}
	return branches
}

var statusByCode = map[byte]domain.ChangeStatus{
	'A': domain.ChangeAdded,
	'M': domain.ChangeModified,
	'D': domain.ChangeDeleted,
	'R': domain.ChangeRenamed,
	'C': domain.ChangeAdded,
	'T': domain.ChangeModified,
}

type nameStatusOutput string

func (o nameStatusOutput) Changes() []domain.Change {
	changes := []domain.Change{}
	for _, line := range lineOutput(o).Lines() {
		fields := strings.Split(line, "\t")
		if len(fields) < 2 || fields[0] == "" {
			continue
		}
		code := fields[0][0]
		status, known := statusByCode[code]
		if !known {
			status = domain.ChangeModified
		}
		change := domain.Change{Path: fields[len(fields)-1], Status: status}
		if code == 'R' {
			change.PreviousPath = fields[1]
		}
		changes = append(changes, change)
	}
	return changes
}

type lineStat struct {
	additions int
	deletions int
}

type numstatOutput string

func (o numstatOutput) Stats() map[string]lineStat {
	stats := map[string]lineStat{}
	tokens := strings.Split(string(o), "\x00")
	for index := 0; index < len(tokens); index++ {
		fields := strings.Split(tokens[index], "\t")
		if len(fields) < 3 {
			continue
		}
		path := fields[2]
		if path == "" && index+2 < len(tokens) {
			path = tokens[index+2]
			index += 2
		}
		stats[path] = lineStat{additions: statCount(fields[0]), deletions: statCount(fields[1])}
	}
	return stats
}

func (o numstatOutput) ApplyTo(changes []domain.Change) []domain.Change {
	stats := o.Stats()
	for index, change := range changes {
		stat := stats[change.Path]
		changes[index].Additions = stat.additions
		changes[index].Deletions = stat.deletions
	}
	return changes
}

func statCount(value string) int {
	count, err := strconv.Atoi(value)
	if err != nil {
		return 0
	}
	return count
}
