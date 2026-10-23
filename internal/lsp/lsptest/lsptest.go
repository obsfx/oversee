package lsptest

import (
	"bufio"
	"fmt"
	"io"
	"net"
	"net/textproto"
	"strconv"
	"sync"
)

type PipeTransport struct {
	net.Conn
	done chan struct{}
	once sync.Once
}

func NewPipeTransport(conn net.Conn) *PipeTransport {
	return &PipeTransport{Conn: conn, done: make(chan struct{})}
}

func Connect(serve func(net.Conn)) *PipeTransport {
	serverEnd, clientEnd := net.Pipe()
	go serve(serverEnd)
	return NewPipeTransport(clientEnd)
}

func (p *PipeTransport) Close() error {
	p.Kill()
	return nil
}

func (p *PipeTransport) Done() <-chan struct{} {
	return p.done
}

func (p *PipeTransport) Err() error {
	return nil
}

func (p *PipeTransport) Kill() {
	p.once.Do(func() {
		p.Conn.Close()
		close(p.done)
	})
}

func Frame(body string) string {
	return fmt.Sprintf("Content-Length: %d\r\n\r\n%s", len(body), body)
}

func WriteFrame(w io.Writer, body []byte) error {
	_, err := io.WriteString(w, Frame(string(body)))
	return err
}

func ReadFrame(reader *bufio.Reader) ([]byte, error) {
	headers, err := textproto.NewReader(reader).ReadMIMEHeader()
	if err != nil {
		return nil, err
	}
	length, err := strconv.Atoi(headers.Get("Content-Length"))
	if err != nil {
		return nil, err
	}
	body := make([]byte, length)
	_, err = io.ReadFull(reader, body)
	return body, err
}
