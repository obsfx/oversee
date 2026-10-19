package git

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"syscall"

	"github.com/obsfx/oversee/internal/domain"
)

const (
	noMergeBaseExitCode = 1
	missingRefExitCode  = 1
)

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
	current, err := r.runner.Text(ctx, "rev-parse", "--abbrev-ref", "HEAD")
	if err != nil {
		return domain.BranchList{}, err
	}
	return domain.BranchList{
		Local:   lineOutput(local).Lines(),
		Remote:  remoteRefOutput(remote).Branches(),
		Current: current,
	}, nil
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

func (r *Repository) Contents(ctx context.Context, comparison domain.Comparison, path string, side domain.FileSide) (domain.Blob, error) {
	blob, err := r.contents(ctx, comparison, path, side)
	if _, failed := errors.AsType[*CommandError](err); failed {
		if refErr := r.requireRefs(ctx, comparison); errors.Is(refErr, domain.ErrUnknownBranch) {
			return nil, refErr
		}
	}
	return blob, err
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

func (r *Repository) contents(ctx context.Context, comparison domain.Comparison, path string, side domain.FileSide) (domain.Blob, error) {
	if side == domain.FileSideNew && comparison.IsUncommitted() {
		return r.workingFile(path)
	}
	ref := comparison.Source
	if side == domain.FileSideOld {
		base, err := r.base(ctx, comparison)
		if err != nil {
			return nil, err
		}
		ref = base
	}
	return r.blobAt(ctx, ref, path)
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
	tracked, err := r.runner.Text(ctx, "ls-files", "--cached")
	if err != nil {
		return domain.FileTree{}, err
	}
	untracked, err := r.runner.Text(ctx, "ls-files", "--others", "--exclude-standard")
	if err != nil {
		return domain.FileTree{}, err
	}
	changes, err := r.changes(ctx, "HEAD")
	if err != nil {
		return domain.FileTree{}, err
	}
	untrackedPaths := lineOutput(untracked).Lines()
	for _, path := range untrackedPaths {
		content, _ := r.workingFile(path)
		changes = append(changes, domain.Change{
			Path:      path,
			Status:    domain.ChangeUntracked,
			Additions: content.LineCount(),
		})
	}
	return domain.FileTree{Paths: append(lineOutput(tracked).Lines(), untrackedPaths...), Changes: changes}, nil
}

func (r *Repository) branchTree(ctx context.Context, comparison domain.Comparison) (domain.FileTree, error) {
	tree, err := r.runner.Text(ctx, "ls-tree", "-r", "--name-only", comparison.Source)
	if err != nil {
		return domain.FileTree{}, err
	}
	base, err := r.base(ctx, comparison)
	if err != nil {
		return domain.FileTree{}, err
	}
	changes, err := r.changes(ctx, base, comparison.Source)
	if err != nil {
		return domain.FileTree{}, err
	}
	return domain.NewFileTree(lineOutput(tree).Lines(), changes), nil
}

func (r *Repository) changes(ctx context.Context, revisions ...string) ([]domain.Change, error) {
	nameStatus, err := r.runner.Text(ctx, slices.Concat([]string{"diff", "--name-status", "-M"}, revisions, []string{"--"})...)
	if err != nil {
		return nil, err
	}
	numstat, err := r.runner.Text(ctx, slices.Concat([]string{"diff", "--numstat", "-M", "-z"}, revisions, []string{"--"})...)
	if err != nil {
		return nil, err
	}
	return numstatOutput(numstat).ApplyTo(nameStatusOutput(nameStatus).Changes()), nil
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

func isMissing(err error) bool {
	return errors.Is(err, fs.ErrNotExist) || errors.Is(err, syscall.ENOTDIR)
}
