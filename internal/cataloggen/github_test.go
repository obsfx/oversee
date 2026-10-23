package cataloggen

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json/v2"
	"io"
	"net/http"
	"strings"
	"sync"
	"testing"
)

const testToken = "secret-token"

type recordedRequest struct {
	url    string
	header http.Header
}

type fakeWeb struct {
	mu        sync.Mutex
	responses map[string][]byte
	requests  []recordedRequest
}

func newFakeWeb() *fakeWeb {
	return &fakeWeb{responses: map[string][]byte{}}
}

func (f *fakeWeb) github(token string) *GitHub {
	return NewGitHub(&http.Client{Transport: f}, token)
}

func (f *fakeWeb) serve(link string, body []byte) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.responses[link] = body
}

func (f *fakeWeb) serveJSON(t *testing.T, link string, value any) {
	t.Helper()
	body, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("encode %s: %v", link, err)
	}
	f.serve(link, body)
}

func (f *fakeWeb) serveRelease(t *testing.T, repository string, release Release) {
	t.Helper()
	f.serveJSON(t, "https://api.github.com/repos/"+repository+"/releases/tags/"+release.Tag, release)
}

func (f *fakeWeb) RoundTrip(request *http.Request) (*http.Response, error) {
	link := request.URL.String()
	f.mu.Lock()
	f.requests = append(f.requests, recordedRequest{url: link, header: request.Header.Clone()})
	body, found := f.responses[link]
	f.mu.Unlock()
	response := &http.Response{
		Proto:         "HTTP/1.1",
		ProtoMajor:    1,
		ProtoMinor:    1,
		StatusCode:    http.StatusOK,
		Status:        "200 OK",
		Header:        http.Header{},
		Body:          io.NopCloser(bytes.NewReader(body)),
		ContentLength: int64(len(body)),
		Request:       request,
	}
	if !found {
		response.StatusCode = http.StatusNotFound
		response.Status = "404 Not Found"
		response.Body = http.NoBody
		response.ContentLength = 0
	}
	return response, nil
}

func (f *fakeWeb) requestsTo(link string) []recordedRequest {
	f.mu.Lock()
	defer f.mu.Unlock()
	var matched []recordedRequest
	for _, request := range f.requests {
		if request.url == link {
			matched = append(matched, request)
		}
	}
	return matched
}

func sha256Hex(content []byte) string {
	sum := sha256.Sum256(content)
	return hex.EncodeToString(sum[:])
}

func TestGitHubSendsTheTokenOnlyToTheAPI(t *testing.T) {
	const (
		latestURL   = "https://api.github.com/repos/acme/tool/releases/latest"
		downloadURL = "https://github.com/acme/tool/releases/download/v1/tool.zip"
	)
	cases := []struct {
		name              string
		token             string
		wantAuthorization string
	}{
		{name: "with a token", token: testToken, wantAuthorization: "Bearer " + testToken},
		{name: "without a token", token: ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			web := newFakeWeb()
			web.serveJSON(t, latestURL, Release{Tag: "v1", Assets: []ReleaseAsset{{Name: "tool.zip", DownloadURL: downloadURL}}})
			web.serve(downloadURL, []byte("zip content"))
			github := web.github(c.token)

			release, err := github.LatestRelease(t.Context(), "acme/tool")
			if err != nil {
				t.Fatalf("LatestRelease() = %v", err)
			}
			content, err := github.FetchAsset(t.Context(), release, "tool.zip")
			if err != nil {
				t.Fatalf("FetchAsset() = %v", err)
			}
			if string(content) != "zip content" {
				t.Fatalf("FetchAsset() = %q, want %q", content, "zip content")
			}

			api := web.requestsTo(latestURL)
			download := web.requestsTo(downloadURL)
			if len(api) != 1 || len(download) != 1 {
				t.Fatalf("requests: %d to the api, %d to the download, want 1 each", len(api), len(download))
			}
			if got := api[0].header.Get("Authorization"); got != c.wantAuthorization {
				t.Fatalf("api Authorization = %q, want %q", got, c.wantAuthorization)
			}
			if got := api[0].header.Get("Accept"); got != "application/vnd.github+json" {
				t.Fatalf("api Accept = %q", got)
			}
			if got := download[0].header.Get("Authorization"); got != "" {
				t.Fatalf("download Authorization = %q, want none", got)
			}
			if got := download[0].header.Get("Accept"); got != "" {
				t.Fatalf("download Accept = %q, want none", got)
			}
			for _, request := range append(api, download...) {
				if got := request.header.Get("User-Agent"); got != "oversee-catalog-gen" {
					t.Fatalf("%s User-Agent = %q", request.url, got)
				}
			}
		})
	}
}

func TestGitHubFailures(t *testing.T) {
	web := newFakeWeb()
	web.serve("https://api.github.com/repos/acme/broken/releases/latest", []byte("not json"))
	github := web.github(testToken)
	cases := []struct {
		name string
		run  func() error
		want string
	}{
		{
			name: "download status",
			run: func() error {
				_, err := github.Fetch(t.Context(), "https://example.com/missing.zip")
				return err
			},
			want: "get https://example.com/missing.zip: status 404 Not Found",
		},
		{
			name: "hash status",
			run: func() error {
				_, err := github.Hash(t.Context(), "https://example.com/missing.zip")
				return err
			},
			want: "status 404 Not Found",
		},
		{
			name: "release status",
			run: func() error {
				_, err := github.ReleaseByTag(t.Context(), "acme/tool", "v9")
				return err
			},
			want: "get https://api.github.com/repos/acme/tool/releases/tags/v9: status 404 Not Found",
		},
		{
			name: "release body",
			run: func() error {
				_, err := github.LatestRelease(t.Context(), "acme/broken")
				return err
			},
			want: "decode repos/acme/broken/releases/latest",
		},
		{
			name: "asset missing from the release",
			run: func() error {
				_, err := github.FetchAsset(t.Context(), Release{Tag: "v1"}, "tool.zip")
				return err
			},
			want: "release v1 has no tool.zip",
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if err := c.run(); err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("error = %v, want one containing %q", err, c.want)
			}
		})
	}
}

func TestGitHubHash(t *testing.T) {
	const link = "https://example.com/tool.tar.gz"
	content := []byte("tool archive")
	web := newFakeWeb()
	web.serve(link, content)
	got, err := web.github(testToken).Hash(t.Context(), link)
	if err != nil {
		t.Fatalf("Hash() = %v", err)
	}
	if want := sha256Hex(content); got != want {
		t.Fatalf("Hash() = %s, want %s", got, want)
	}
}

func TestReleaseDigest(t *testing.T) {
	sum := sha256Hex([]byte("asset"))
	cases := []struct {
		name   string
		digest string
		want   string
	}{
		{name: "sha256 digest", digest: "sha256:" + sum, want: sum},
		{name: "uppercase digest", digest: "SHA256:" + strings.ToUpper(sum), want: sum},
		{name: "no digest", digest: ""},
		{name: "other algorithm", digest: "sha512:" + sum + sum},
		{name: "digest without an algorithm", digest: sum},
		{name: "digest that is not hex", digest: "sha256:" + strings.Repeat("g", 64)},
		{name: "short digest", digest: "sha256:" + sum[:62]},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			release := Release{Tag: "v1", Assets: []ReleaseAsset{{Name: "other.zip", Digest: "sha256:" + strings.Repeat("0", 64)}, {Name: "tool.zip", Digest: c.digest}}}
			got, err := release.Digest("tool.zip")
			if err != nil || got != c.want {
				t.Fatalf("Digest() = %q, %v, want %q", got, err, c.want)
			}
		})
	}
	t.Run("missing asset", func(t *testing.T) {
		_, err := Release{Tag: "v1"}.Digest("tool.zip")
		if err == nil || !strings.Contains(err.Error(), "release v1 has no asset tool.zip") {
			t.Fatalf("Digest() = %v, want a missing asset error", err)
		}
	})
}
