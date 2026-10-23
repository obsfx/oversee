package git

import (
	"bufio"
	"io"
	"regexp"
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

type catFileOutput struct {
	reader *bufio.Reader
}

const (
	catFileMissing   = "missing"
	catFileAmbiguous = "ambiguous"
)

func (o catFileOutput) Blobs(names []string, limit int64) map[string]domain.Blob {
	blobs := make(map[string]domain.Blob, len(names))
	for _, name := range names {
		header, err := o.reader.ReadString('\n')
		if err != nil {
			break
		}
		fields := strings.Fields(header)
		last := len(fields) - 1
		if last < 2 || fields[last] == catFileMissing || fields[last] == catFileAmbiguous {
			continue
		}
		size, err := strconv.Atoi(fields[last])
		if err != nil || size < 0 {
			break
		}
		if fields[last-1] != "blob" || int64(size) > limit {
			if _, err := o.reader.Discard(size + 1); err != nil {
				break
			}
			continue
		}
		blob := make(domain.Blob, size)
		if _, err := io.ReadFull(o.reader, blob); err != nil {
			break
		}
		blobs[name] = blob
		if _, err := o.reader.Discard(1); err != nil {
			break
		}
	}
	return blobs
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
		stats[path] = lineStat{additions: numberOr(fields[0], 0), deletions: numberOr(fields[1], 0)}
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

var hunkHeader = regexp.MustCompile(`^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@`)

const (
	patchFileStart = "diff --git "
	patchOldPath   = "--- "
	patchNewPath   = "+++ "
	patchNullPath  = "/dev/null"
	patchOldPrefix = "a/"
	patchNewPrefix = "b/"
)

type patchFile struct {
	changes domain.LineChanges
	oldPath string
	newPath string
	inHunks bool
}

func (f *patchFile) read(line string) {
	if f.inHunks {
		f.readHunk(line)
		return
	}
	switch {
	case strings.HasPrefix(line, patchOldPath):
		f.oldPath = patchPath(strings.TrimPrefix(line, patchOldPath), patchOldPrefix)
	case strings.HasPrefix(line, patchNewPath):
		f.newPath = patchPath(strings.TrimPrefix(line, patchNewPath), patchNewPrefix)
	case strings.HasPrefix(line, "@@"):
		f.inHunks = true
		f.readHunk(line)
	}
}

func (f *patchFile) readHunk(line string) {
	match := hunkHeader.FindStringSubmatch(line)
	if match == nil {
		return
	}
	f.changes.Hunks = append(f.changes.Hunks, domain.LineHunk{
		OldStart: numberOr(match[1], 0),
		OldLines: numberOr(match[2], 1),
		NewStart: numberOr(match[3], 0),
		NewLines: numberOr(match[4], 1),
	})
}

func (f *patchFile) finish() (domain.LineChanges, bool) {
	changes := f.changes
	changes.Status = domain.ChangeModified
	changes.Path = f.newPath
	switch {
	case f.oldPath == "":
		changes.Status = domain.ChangeAdded
	case f.newPath == "":
		changes.Status = domain.ChangeDeleted
		changes.Path = f.oldPath
	case f.oldPath != f.newPath:
		changes.Status = domain.ChangeRenamed
		changes.PreviousPath = f.oldPath
	}
	return changes, changes.Path != "" && len(changes.Hunks) > 0
}

type patchOutput string

func (o patchOutput) Files() []domain.LineChanges {
	files := []domain.LineChanges{}
	var current *patchFile
	flush := func() {
		if current == nil {
			return
		}
		if changes, ok := current.finish(); ok {
			files = append(files, changes)
		}
	}
	for line := range strings.SplitSeq(string(o), "\n") {
		if strings.HasPrefix(line, patchFileStart) {
			flush()
			current = &patchFile{}
			continue
		}
		if current != nil {
			current.read(line)
		}
	}
	flush()
	return files
}

func patchPath(raw, prefix string) string {
	path := strings.TrimSuffix(raw, "\t")
	if path == patchNullPath {
		return ""
	}
	if strings.HasPrefix(path, `"`) {
		unquoted, err := strconv.Unquote(path)
		if err == nil {
			path = unquoted
		}
	}
	return strings.TrimPrefix(path, prefix)
}

func numberOr(value string, fallback int) int {
	number, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return number
}
