package cataloggen

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json/v2"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"
)

type GitHub struct {
	client *http.Client
	token  string
}

type Release struct {
	Tag    string         `json:"tag_name"`
	Assets []ReleaseAsset `json:"assets"`
}

type ReleaseAsset struct {
	Name        string `json:"name"`
	DownloadURL string `json:"browser_download_url"`
	Digest      string `json:"digest"`
}

func NewGitHub(client *http.Client, token string) *GitHub {
	return &GitHub{client: client, token: token}
}

func (r Release) Asset(name string) (ReleaseAsset, bool) {
	index := slices.IndexFunc(r.Assets, func(asset ReleaseAsset) bool {
		return asset.Name == name
	})
	if index < 0 {
		return ReleaseAsset{}, false
	}
	return r.Assets[index], true
}

func (r Release) Digest(name string) (string, error) {
	asset, found := r.Asset(name)
	if !found {
		return "", fmt.Errorf("release %s has no asset %s", r.Tag, name)
	}
	sum, isSHA256 := strings.CutPrefix(strings.ToLower(asset.Digest), "sha256:")
	if _, err := hex.DecodeString(sum); !isSHA256 || err != nil || len(sum) != sha256.Size*2 {
		return "", nil
	}
	return sum, nil
}

func (g *GitHub) LatestRelease(ctx context.Context, repository string) (Release, error) {
	var release Release
	err := g.api(ctx, "repos/"+repository+"/releases/latest", &release)
	return release, err
}

func (g *GitHub) ReleaseByTag(ctx context.Context, repository, tag string) (Release, error) {
	var release Release
	err := g.api(ctx, "repos/"+repository+"/releases/tags/"+tag, &release)
	return release, err
}

func (g *GitHub) FetchAsset(ctx context.Context, release Release, name string) ([]byte, error) {
	asset, ok := release.Asset(name)
	if !ok {
		return nil, fmt.Errorf("release %s has no %s", release.Tag, name)
	}
	return g.Fetch(ctx, asset.DownloadURL)
}

func (g *GitHub) Fetch(ctx context.Context, url string) ([]byte, error) {
	body, err := g.open(ctx, url, false)
	if err != nil {
		return nil, err
	}
	defer body.Close()
	return io.ReadAll(body)
}

func (g *GitHub) Hash(ctx context.Context, url string) (string, error) {
	body, err := g.open(ctx, url, false)
	if err != nil {
		return "", err
	}
	defer body.Close()
	hash := sha256.New()
	if _, err := io.Copy(hash, body); err != nil {
		return "", fmt.Errorf("read %s: %w", url, err)
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

func (g *GitHub) api(ctx context.Context, path string, target any) error {
	body, err := g.open(ctx, "https://api.github.com/"+path, true)
	if err != nil {
		return err
	}
	defer body.Close()
	if err := json.UnmarshalRead(body, target); err != nil {
		return fmt.Errorf("decode %s: %w", path, err)
	}
	return nil
}

func (g *GitHub) open(ctx context.Context, url string, api bool) (io.ReadCloser, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("User-Agent", "oversee-catalog-gen")
	if api {
		request.Header.Set("Accept", "application/vnd.github+json")
		if g.token != "" {
			request.Header.Set("Authorization", "Bearer "+g.token)
		}
	}
	response, err := g.client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("get %s: %w", url, err)
	}
	if response.StatusCode != http.StatusOK {
		response.Body.Close()
		return nil, fmt.Errorf("get %s: status %s", url, response.Status)
	}
	return response.Body, nil
}
