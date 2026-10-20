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

type pathListOutput string

func (o pathListOutput) Paths() []string {
	var paths []string
	for path := range strings.SplitSeq(string(o), "\x00") {
		if path != "" {
			paths = append(paths, path)
		}
	}
	return paths
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

type rawEntry struct {
	change domain.Change
	source string
	target string
}

func (e rawEntry) revised(target string) domain.Change {
	change := e.change
	change.Revision = domain.RevisionOf(e.source, target)
	return change
}

type rawOutput string

func (o rawOutput) Entries() []rawEntry {
	entries := []rawEntry{}
	tokens := strings.Split(string(o), nul)
	for index := 0; index < len(tokens); index++ {
		header, isHeader := strings.CutPrefix(tokens[index], ":")
		fields := strings.Fields(header)
		if !isHeader || len(fields) < 5 || index+1 >= len(tokens) {
			continue
		}
		code := fields[4][0]
		status, known := statusByCode[code]
		if !known {
			status = domain.ChangeModified
		}
		index++
		entry := rawEntry{change: domain.Change{Path: tokens[index], Status: status}, source: fields[2], target: fields[3]}
		if (code == 'R' || code == 'C') && index+1 < len(tokens) {
			index++
			if code == 'R' {
				entry.change.PreviousPath = entry.change.Path
			}
			entry.change.Path = tokens[index]
		}
		entries = append(entries, entry)
	}
	return entries
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

func (o numstatOutput) ApplyTo(entries []rawEntry) []rawEntry {
	stats := o.Stats()
	for index, entry := range entries {
		stat := stats[entry.change.Path]
		entries[index].change.Additions = stat.additions
		entries[index].change.Deletions = stat.deletions
	}
	return entries
}

func statCount(value string) int {
	count, err := strconv.Atoi(value)
	if err != nil {
		return 0
	}
	return count
}
