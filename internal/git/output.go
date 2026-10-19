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

type refListOutput string

func (o refListOutput) Refs() map[string]string {
	refs := map[string]string{}
	for _, line := range lineOutput(o).Lines() {
		objectName, refName, found := strings.Cut(line, " ")
		if found {
			refs[refName] = objectName
		}
	}
	return refs
}

type treeEntryOutput string

func (o treeEntryOutput) HasBlob(path string) bool {
	for entry := range strings.SplitSeq(string(o), nul) {
		meta, name, found := strings.Cut(entry, "\t")
		if !found || name != path {
			continue
		}
		fields := strings.Fields(meta)
		return len(fields) == 3 && fields[1] == "blob"
	}
	return false
}

const (
	nul                    = "\x00"
	porcelainBranchOID     = "# branch.oid "
	porcelainBranchHead    = "# branch.head "
	porcelainOrdinaryEntry = "1"
	porcelainRenamedEntry  = "2"
	porcelainUnmergedEntry = "u"
	porcelainUntrackedPath = "?"
)

var porcelainFieldCounts = map[string]int{
	porcelainOrdinaryEntry: 9,
	porcelainRenamedEntry:  10,
	porcelainUnmergedEntry: 11,
	porcelainUntrackedPath: 2,
}

type statusEntry struct {
	kind         string
	path         string
	originalPath string
	record       string
}

func (e statusEntry) signature() string {
	return e.record + nul + e.originalPath
}

type statusLine string

func (l statusLine) entry() (statusEntry, bool) {
	kind, _, _ := strings.Cut(string(l), " ")
	fieldCount, known := porcelainFieldCounts[kind]
	if !known {
		return statusEntry{}, false
	}
	fields := strings.SplitN(string(l), " ", fieldCount)
	if len(fields) < fieldCount {
		return statusEntry{}, false
	}
	return statusEntry{
		kind:   kind,
		path:   fields[fieldCount-1],
		record: strings.Join(fields[:fieldCount-1], " "),
	}, true
}

type statusReport struct {
	head    string
	branch  string
	entries []statusEntry
}

func (r *statusReport) readHeader(token string) bool {
	if head, found := strings.CutPrefix(token, porcelainBranchOID); found {
		r.head = head
		return true
	}
	if branch, found := strings.CutPrefix(token, porcelainBranchHead); found {
		r.branch = branch
		return true
	}
	return false
}

type statusOutput string

func (o statusOutput) Report() statusReport {
	report := statusReport{}
	tokens := strings.Split(string(o), nul)
	for index := 0; index < len(tokens); index++ {
		if report.readHeader(tokens[index]) {
			continue
		}
		entry, ok := statusLine(tokens[index]).entry()
		if !ok {
			continue
		}
		if entry.kind == porcelainRenamedEntry && index+1 < len(tokens) {
			index++
			entry.originalPath = tokens[index]
		}
		report.entries = append(report.entries, entry)
	}
	return report
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
	tokens := strings.Split(string(o), nul)
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
