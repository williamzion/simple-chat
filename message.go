package main

import "time"

// message represents a single user message.
type message struct {
	Name    string
	Message string
	When    time.Time
}
