package main

import (
	"flag"
	"log"
	"net/http"
	"path/filepath"
	"sync"
	"text/template"
)

var addr = flag.String("addr", ":8080", "http service address")

// templ represents a single template.
type templHandler struct {
	once     sync.Once
	filename string
	templ    *template.Template
}

func (t *templHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	t.once.Do(func() {
		t.templ = template.Must(template.ParseFiles(filepath.Join("templ", t.filename)))
	})
	t.templ.Execute(w, nil)
}

func main() {
	flag.Parse()

	hub := newHub()
	go hub.run()

	fs := http.FileServer(http.Dir("assets"))

	http.Handle("/static/", http.StripPrefix("/static/", fs))
	http.Handle("/", MustAuth(&templHandler{filename: "index.html"}))
	http.Handle("/login", &templHandler{filename: "login.html"})
	http.HandleFunc("/auth/", loginHandler)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	if err := http.ListenAndServe(*addr, nil); err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}
