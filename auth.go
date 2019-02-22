package main

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/go-github/github"
	"golang.org/x/oauth2"
	githubAuth "golang.org/x/oauth2/github"
)

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

// loginHandler handles third parties' authorization.
// /auth/login/github
// /auth/callback/github
func loginHandler(w http.ResponseWriter, r *http.Request) {
	segs := strings.Split(r.URL.Path, "/")
	action := segs[2]
	provider := segs[3]
	if !strings.Contains(provider, "github") {
		http.NotFound(w, r)
		return
	}

	authState := "state"
	conf := &oauth2.Config{
		ClientID:     "1e9196c9c51d517d4ee9",
		ClientSecret: "946290a4a0c86ba627f48a41aefdbc01cf86be80",
		Endpoint:     githubAuth.Endpoint,
		Scopes:       []string{"user:email"},
	}

	switch action {
	case "login":
		url := conf.AuthCodeURL(authState, oauth2.AccessTypeOnline)
		fmt.Printf("Visit the URL for the auth dialog: %v\n", url)
		http.Redirect(w, r, url, http.StatusTemporaryRedirect)
	case "callback":
		// Called by github with provided callback url.
		state := r.FormValue("state")
		if state != authState {
			fmt.Printf("invalid oauth state, expected (%s), got (%s)\n", authState, state)
			http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
			return
		}

		code := r.FormValue("code")
		tok, err := conf.Exchange(oauth2.NoContext, code)
		if err != nil {
			fmt.Printf("conf.Exchange() failed with (%v)\n", err)
			http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
			return
		}

		oauthClient := conf.Client(oauth2.NoContext, tok)
		client := github.NewClient(oauthClient)
		user, _, err := client.Users.Get(oauth2.NoContext, "")
		if err != nil {
			fmt.Printf("client.Users.Get() faled with '%s'\n", err)
			http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
			return
		}
		fmt.Printf("Logged in as GitHub user: %s\n", *user.Login)
		cookie := http.Cookie{
			Name:  "auth",
			Value: base64.StdEncoding.EncodeToString([]byte(*user.Login)),
		}
		http.SetCookie(w, &cookie)
		http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
	default:
		// w.WriteHeader(http.StatusNotFound)
		// fmt.Fprintf(w, "Auth action %s not supported", action)
		http.NotFound(w, r)
	}
}
