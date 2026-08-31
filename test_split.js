let text = `Here's a thinking process:
1. ...
...
] to be honest
[Error]

amar mood nai, pore kotha hobe`;

// To parse out the "real" response if it starts with "Here's a thinking process:"
// Usually the real response is at the very end after the thought process. 
// A better way is just to rely on the <think> tag regex, which I've already implemented.
// If the user's issue was just <think> tags not being parsed, then my first regex fixes it perfectly.
console.log("ok");
