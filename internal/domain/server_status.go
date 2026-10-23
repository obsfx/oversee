package domain

type ServerStatus string

const (
	ServerReady         ServerStatus = "ready"
	ServerUnsupported   ServerStatus = "unsupported"
	ServerNotInstalled  ServerStatus = "not-installed"
	ServerNeedsCheckout ServerStatus = "needs-checkout"
	ServerStarting      ServerStatus = "starting"
	ServerIndexing      ServerStatus = "indexing"
	ServerFailed        ServerStatus = "failed"
)

var serverStatusRanks = map[ServerStatus]int{
	ServerReady:         0,
	ServerUnsupported:   1,
	ServerNeedsCheckout: 2,
	ServerNotInstalled:  3,
	ServerStarting:      4,
	ServerIndexing:      5,
	ServerFailed:        6,
}

func (s ServerStatus) rank() int {
	return serverStatusRanks[s]
}

func (s ServerStatus) Transient() bool {
	return s == ServerStarting || s == ServerIndexing || s == ServerFailed
}

func (s ServerStatus) Tracing() bool {
	return s == ServerStarting || s == ServerIndexing
}

func (s ServerStatus) ErrorOf(err error) string {
	if s != ServerFailed || err == nil {
		return ""
	}
	return err.Error()
}
