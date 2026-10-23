package git

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"syscall"

	"github.com/obsfx/oversee/internal/domain"
)

const (
	noMergeBaseExitCode = 1
	missingRefExitCode  = 1
)

var patchArgs = []string{
	"-c", "core.quotePath=false",
	"diff", "-U0", "--inter-hunk-context=0", "--submodule=short", "-M", "--no-color", "--no-ext-diff", "--no-textconv",
	"--src-prefix=" + patchOldPrefix, "--dst-prefix=" + patchNewPrefix,
}

type Repository struct {
	root   string
	gitDir string
	runner Runner
}

func NewRepository(root, gitDir string) *Repository {
	return &Repository{root: root, gitDir: gitDir, runner: NewRunner(root)}
}

func (r *Repository) Branches(ctx context.Context) (domain.BranchList, error) {
	local, err := r.runner.Text(ctx, "branch", "--format=%(refname:short)")
	if err != nil {
		return domain.BranchList{}, err
	}
	remote, err := r.runner.Text(ctx, "for-each-ref", "--format=%(refname:short)%09%(symref)", "refs/remotes")
	if err != nil {
		return domain.BranchList{}, err
	}
	current, err := r.CurrentBranch(ctx)
	if err != nil {
		return domain.BranchList{}, err
	}
	return domain.BranchList{
		Local:   lineOutput(local).Lines(),
		Remote:  remoteRefOutput(remote).Branches(),
		Current: current,
	}, nil
}

func (r *Repository) CurrentBranch(ctx context.Context) (string, error) {
	return r.runner.Text(ctx, "rev-parse", "--abbrev-ref", "HEAD")
}

func (r *Repository) Tree(ctx context.Context, comparison domain.Comparison) (domain.FileTree, error) {
	if err := r.requireRefs(ctx, comparison); err != nil {
		return domain.FileTree{}, err
	}
	if comparison.IsUncommitted() {
		return r.uncommittedTree(ctx)
	}
	return r.branchTree(ctx, comparison)
}

func (r *Repository) TrackedPaths(ctx context.Context, comparison domain.Comparison) ([]string, error) {
	if comparison.IsUncommitted() {
		return r.trackedPaths(ctx)
	}
	return r.branchPaths(ctx, comparison.Source)
}

func (r *Repository) Contents(ctx context.Context, comparison domain.Comparison, path string, side domain.FileSide) (domain.Blob, error) {
	blob, err := r.contents(ctx, comparison, path, side)
	if err != nil {
		return nil, r.refError(ctx, comparison, err)
	}
	return blob, nil
}

func (r *Repository) requireRefs(ctx context.Context, comparison domain.Comparison) error {
	for _, ref := range comparison.Refs() {
		_, err := r.runner.Text(ctx, "rev-parse", "--verify", "--quiet", ref+"^{commit}")
		if commandErr, ok := errors.AsType[*CommandError](err); ok && commandErr.ExitCode == missingRefExitCode {
			return fmt.Errorf("%w: %s", domain.ErrUnknownBranch, ref)
		}
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) ContentsOf(ctx context.Context, comparison domain.Comparison, side domain.FileSide, paths []string, limit int64) (map[string]domain.Blob, error) {
	ref, working, err := r.sideRef(ctx, comparison, side)
	if err != nil {
		return nil, r.refError(ctx, comparison, err)
	}
	if working {
		return r.workingFiles(paths, limit)
	}
	var input bytes.Buffer
	names := make([]string, 0, len(paths))
	for _, path := range paths {
		if strings.ContainsAny(path, "\n\r") {
			continue
		}
		input.WriteString(ref + ":" + path + "\n")
		names = append(names, path)
	}
	if len(names) == 0 {
		return map[string]domain.Blob{}, nil
	}
	var blobs map[string]domain.Blob
	err = r.runner.Stream(ctx, input.Bytes(), func(output *bufio.Reader) {
		blobs = catFileOutput{reader: output}.Blobs(names, limit)
	}, "cat-file", "--batch")
	if err != nil {
		return nil, r.refError(ctx, comparison, err)
	}
	if len(blobs) < len(names) {
		if refErr := r.requireRefs(ctx, comparison); errors.Is(refErr, domain.ErrUnknownBranch) {
			return nil, refErr
		}
	}
	return blobs, nil
}

func (r *Repository) refError(ctx context.Context, comparison domain.Comparison, err error) error {
	if _, failed := errors.AsType[*CommandError](err); failed {
		if refErr := r.requireRefs(ctx, comparison); errors.Is(refErr, domain.ErrUnknownBranch) {
			return refErr
		}
	}
	return err
}

func (r *Repository) sideRef(ctx context.Context, comparison domain.Comparison, side domain.FileSide) (string, bool, error) {
	if side == domain.FileSideNew && comparison.IsUncommitted() {
		return "", true, nil
	}
	if side == domain.FileSideOld {
		base, err := r.base(ctx, comparison)
		return base, false, err
	}
	return comparison.Source, false, nil
}

func (r *Repository) contents(ctx context.Context, comparison domain.Comparison, path string, side domain.FileSide) (domain.Blob, error) {
	ref, working, err := r.sideRef(ctx, comparison, side)
	if err != nil {
		return nil, err
	}
	if working {
		return r.workingFile(path)
	}
	return r.blobAt(ctx, ref, path)
}

func (r *Repository) ChangedLines(ctx context.Context, comparison domain.Comparison) ([]domain.LineChanges, error) {
	if err := r.requireRefs(ctx, comparison); err != nil {
		return nil, err
	}
	base, err := r.base(ctx, comparison)
	if err != nil {
		return nil, err
	}
	revisions := []string{base}
	if !comparison.IsUncommitted() {
		revisions = append(revisions, comparison.Source)
	}
	patch, err := r.runner.Text(ctx, slices.Concat(patchArgs, revisions, []string{"--"})...)
	if err != nil {
		return nil, err
	}
	files := patchOutput(patch).Files()
	if !comparison.IsUncommitted() {
		return files, nil
	}
	untracked, err := r.untrackedPaths(ctx)
	if err != nil {
		return nil, err
	}
	for _, path := range untracked {
		files = append(files, domain.WholeFileAdded(path))
	}
	return files, nil
}

func (r *Repository) ChangedPaths(ctx context.Context, from, to string) ([]string, error) {
	output, err := r.runner.Bytes(ctx, "diff", "--name-only", "--no-renames", "-z", from, to, "--")
	if err != nil {
		return nil, err
	}
	return pathListOutput(output).Paths(), nil
}

func (r *Repository) Fingerprint(ctx context.Context) (domain.WorkspaceFingerprint, error) {
	status, err := r.runner.Bytes(ctx, "--no-optional-locks", "status", "--porcelain=v2", "-z", "--branch", "--no-ahead-behind", "--untracked-files=all")
	if err != nil {
		return domain.WorkspaceFingerprint{}, err
	}
	refs, err := r.runner.Text(ctx, "for-each-ref", "--format=%(objectname) %(refname)", "refs/heads", "refs/remotes")
	if err != nil {
		return domain.WorkspaceFingerprint{}, err
	}
	report := statusOutput(status).Report()
	worktree := make(map[string]domain.PathState, len(report.entries))
	for _, entry := range report.entries {
		worktree[entry.path] = r.pathState(entry)
	}
	return domain.WorkspaceFingerprint{
		Head:                report.head,
		Branch:              report.branch,
		Refs:                refListOutput(refs).Refs(),
		Worktree:            worktree,
		OperationInProgress: r.indexLocked(),
	}, nil
}

func (r *Repository) uncommittedTree(ctx context.Context) (domain.FileTree, error) {
	tracked, err := r.trackedPaths(ctx)
	if err != nil {
		return domain.FileTree{}, err
	}
	untrackedPaths, err := r.untrackedPaths(ctx)
	if err != nil {
		return domain.FileTree{}, err
	}
	entries, err := r.changes(ctx, "HEAD")
	if err != nil {
		return domain.FileTree{}, err
	}
	changes := make([]domain.Change, 0, len(entries)+len(untrackedPaths))
	for _, entry := range entries {
		changes = append(changes, entry.revised(r.workingIdentity(entry)))
	}
	for _, path := range untrackedPaths {
		content, _ := r.workingFile(path)
		changes = append(changes, domain.Change{
			Path:      path,
			Status:    domain.ChangeUntracked,
			Additions: content.LineCount(),
			Revision:  domain.RevisionOf("", content.Digest()),
		})
	}
	return domain.FileTree{Paths: append(tracked, untrackedPaths...), Changes: changes}, nil
}

func (r *Repository) branchTree(ctx context.Context, comparison domain.Comparison) (domain.FileTree, error) {
	paths, err := r.branchPaths(ctx, comparison.Source)
	if err != nil {
		return domain.FileTree{}, err
	}
	base, err := r.base(ctx, comparison)
	if err != nil {
		return domain.FileTree{}, err
	}
	entries, err := r.changes(ctx, base, comparison.Source)
	if err != nil {
		return domain.FileTree{}, err
	}
	changes := make([]domain.Change, 0, len(entries))
	for _, entry := range entries {
		changes = append(changes, entry.revised(entry.target))
	}
	return domain.NewFileTree(paths, changes), nil
}

func (r *Repository) trackedPaths(ctx context.Context) ([]string, error) {
	return r.listedPaths(ctx, "ls-files", "-z", "--cached")
}

func (r *Repository) untrackedPaths(ctx context.Context) ([]string, error) {
	return r.listedPaths(ctx, "ls-files", "-z", "--others", "--exclude-standard")
}

func (r *Repository) branchPaths(ctx context.Context, ref string) ([]string, error) {
	return r.listedPaths(ctx, "ls-tree", "-r", "-z", "--name-only", ref)
}

func (r *Repository) listedPaths(ctx context.Context, args ...string) ([]string, error) {
	output, err := r.runner.Bytes(ctx, args...)
	if err != nil {
		return nil, err
	}
	return pathListOutput(output).Paths(), nil
}

func (r *Repository) changes(ctx context.Context, revisions ...string) ([]rawEntry, error) {
	raw, err := r.runner.Bytes(ctx, slices.Concat([]string{"diff", "--raw", "--no-abbrev", "-z", "-M"}, revisions, []string{"--"})...)
	if err != nil {
		return nil, err
	}
	numstat, err := r.runner.Text(ctx, slices.Concat([]string{"diff", "--numstat", "-M", "-z"}, revisions, []string{"--"})...)
	if err != nil {
		return nil, err
	}
	return numstatOutput(numstat).ApplyTo(rawOutput(raw).Entries()), nil
}

func (r *Repository) workingIdentity(entry rawEntry) string {
	if entry.change.Status == domain.ChangeDeleted {
		return entry.target
	}
	content, err := r.workingFile(entry.change.Path)
	if err != nil {
		return entry.target
	}
	return content.Digest()
}

func (r *Repository) base(ctx context.Context, comparison domain.Comparison) (string, error) {
	if comparison.IsUncommitted() {
		return "HEAD", nil
	}
	base, err := r.runner.Text(ctx, "merge-base", comparison.Target, comparison.Source)
	if commandErr, ok := errors.AsType[*CommandError](err); ok && commandErr.ExitCode == noMergeBaseExitCode {
		return comparison.Target, nil
	}
	return base, err
}

func (r *Repository) blobAt(ctx context.Context, ref, path string) (domain.Blob, error) {
	content, showErr := r.runner.Bytes(ctx, "show", ref+":"+path)
	if showErr == nil {
		return content, nil
	}
	entry, err := r.runner.Bytes(ctx, "ls-tree", "-z", ref, "--", path)
	if err != nil || treeEntryOutput(entry).HasBlob(path) {
		return nil, showErr
	}
	return nil, nil
}

func (r *Repository) workingFile(path string) (domain.Blob, error) {
	absolute := r.absolute(path)
	content, err := os.ReadFile(absolute)
	if err == nil {
		return content, nil
	}
	if isMissing(err) {
		return nil, nil
	}
	if info, statErr := os.Stat(absolute); statErr == nil && info.IsDir() {
		return nil, nil
	}
	return nil, err
}

func (r *Repository) workingFiles(paths []string, limit int64) (map[string]domain.Blob, error) {
	root, err := os.OpenRoot(r.root)
	if err != nil {
		return nil, err
	}
	defer root.Close()
	blobs := make(map[string]domain.Blob, len(paths))
	for _, path := range paths {
		blob, err := regularFile(root, filepath.FromSlash(path), limit)
		if err != nil {
			return nil, err
		}
		if blob != nil {
			blobs[path] = blob
		}
	}
	return blobs, nil
}

func regularFile(root *os.Root, name string, limit int64) (domain.Blob, error) {
	info, err := root.Lstat(name)
	if err != nil {
		return nil, readFailure(err)
	}
	if !info.Mode().IsRegular() || info.Size() > limit {
		return nil, nil
	}
	file, err := root.Open(name)
	if err != nil {
		return nil, readFailure(err)
	}
	defer file.Close()
	content, err := io.ReadAll(io.LimitReader(file, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(content)) > limit {
		return nil, nil
	}
	return content, nil
}

func (r *Repository) pathState(entry statusEntry) domain.PathState {
	state := domain.PathState{Record: entry.signature()}
	info, err := os.Stat(r.absolute(entry.path))
	if err != nil {
		return state
	}
	state.Exists = true
	state.Size = info.Size()
	state.ModTime = info.ModTime()
	return state
}

func (r *Repository) indexLocked() bool {
	_, err := os.Stat(filepath.Join(r.gitDir, "index.lock"))
	return err == nil
}

func (r *Repository) absolute(path string) string {
	return filepath.Join(r.root, filepath.FromSlash(path))
}

func readFailure(err error) error {
	if _, failed := errors.AsType[syscall.Errno](err); failed && !isMissing(err) {
		return err
	}
	return nil
}

func isMissing(err error) bool {
	return errors.Is(err, fs.ErrNotExist) || errors.Is(err, syscall.ENOTDIR)
}
