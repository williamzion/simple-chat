package main

import "net/http"

type authHandler struct {
	next http.Handler
}

func (a *authHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	_, err := r.Cookie("auth")
	if err == http.ErrNoCookie {
		// w.Header().Set("Location", "/login")
		// w.WriteHeader(http.StatusTemporaryRedirect)
		// Or use below code instead.
		http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	// Success - call the next handler.
	a.next.ServeHTTP(w, r)
}

// MustAuth is a deccorator of authHandler. Any handler used as next handler must be authorized.
func MustAuth(handler http.Handler) http.Handler {
	return &authHandler{next: handler}
}
