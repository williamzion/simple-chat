# Simple-Chat

Simple-chat is written in Golang under instruction of [Go Programming Blueprints](https://www.goodreads.com/book/show/32902495-go-programming-blueprints---second-edition).

## Introduction

Simple-chat is a websocket and github oauth2 implemented simple chatting web application.

Dependencies used in this application are:

- [websocket](https://github.com/gorilla/websocket) by gorilla
- [oauth2](https://golang.org/x/oauth2)
- [go-github](https://github.com/google/go-github/github)

## Features

- Multiple chatting rooms among users.

- Login with oauth2 via Github

## Running the application

The application requires a working Go development environment.

Note: please substitute github oauth2 credentials with your own before running this app to take effect.

$ `go get github.com/williamzion/simple-chat`

$ `cd go list -f '{{.Dir}}' github.com/williamzion/simple-chat`

$ `go run *.go`

To use the chat application, open http://localhost:8080/ in your browser.

## Author

- [William](https://github.com/williamzion)
