package git

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"slices"

	"github.com/obsfx/oversee/internal/domain"
)

const noMergeBaseExitCode = 1

type Repository struct {
	root   string
	runner Runner
}

func NewRepository(root string) *Repository {
	return &Repository{root: root, runner: NewRunner(root)}
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
	if comparison.IsUncommitted() {
		return r.uncommittedTree(ctx)
	}
	return r.branchTree(ctx, comparison)
}

func (r *Repository) Contents(ctx context.Context, comparison domain.Comparison, path string, side domain.FileSide) (domain.Blob, error) {
	if side == domain.FileSideNew && comparison.IsUncommitted() {
		return r.workingFile(path), nil
	}
	ref := comparison.Source
	if side == domain.FileSideOld {
		base, err := r.base(ctx, comparison)
		if err != nil {
			return nil, err
		}
		ref = base
	}
	return r.blobAt(ctx, ref, path), nil
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
		changes = append(changes, domain.Change{
			Path:      path,
			Status:    domain.ChangeUntracked,
			Additions: r.workingFile(path).LineCount(),
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

func (r *Repository) blobAt(ctx context.Context, ref, path string) domain.Blob {
	content, err := r.runner.Bytes(ctx, "show", ref+":"+path)
	if err != nil {
		return nil
	}
	return content
}

func (r *Repository) workingFile(path string) domain.Blob {
	content, err := os.ReadFile(filepath.Join(r.root, filepath.FromSlash(path)))
	if err != nil {
		return nil
	}
	return content
}
