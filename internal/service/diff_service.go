package service

import (
	"context"
	"fmt"

	"github.com/obsfx/oversee/internal/domain"
)

type DiffService struct {
	git GitReader
}

func NewDiffService(git GitReader) *DiffService {
	return &DiffService{git: git}
}

func (s *DiffService) Branches(ctx context.Context) (domain.BranchList, error) {
	return s.git.Branches(ctx)
}

func (s *DiffService) Tree(ctx context.Context, comparison domain.Comparison) (domain.FileTree, error) {
	if err := comparison.Validate(); err != nil {
		return domain.FileTree{}, err
	}
	return s.git.Tree(ctx, comparison)
}

func (s *DiffService) FileDiff(ctx context.Context, comparison domain.Comparison, file domain.FileRef) (domain.FileDiff, error) {
	if err := validateFileRequest(comparison, file); err != nil {
		return domain.FileDiff{}, err
	}
	oldBlob, err := s.git.Contents(ctx, comparison, file.OldPath(), domain.FileSideOld)
	if err != nil {
		return domain.FileDiff{}, err
	}
	newBlob, err := s.git.Contents(ctx, comparison, file.Path, domain.FileSideNew)
	if err != nil {
		return domain.FileDiff{}, err
	}
	return domain.NewFileDiff(file, oldBlob, newBlob), nil
}

func (s *DiffService) Blob(ctx context.Context, comparison domain.Comparison, file domain.FileRef, side domain.FileSide) (domain.Blob, error) {
	if err := validateFileRequest(comparison, file); err != nil {
		return nil, err
	}
	if err := side.Validate(); err != nil {
		return nil, err
	}
	path := file.PathOn(side)
	blob, err := s.git.Contents(ctx, comparison, path, side)
	if err != nil {
		return nil, err
	}
	if !blob.Exists() {
		return nil, fmt.Errorf("file %s on the %s side: %w", path, side, domain.ErrNotFound)
	}
	return blob, nil
}

func validateFileRequest(comparison domain.Comparison, file domain.FileRef) error {
	if err := comparison.Validate(); err != nil {
		return err
	}
	return file.Validate()
}
