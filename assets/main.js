$(function() {
  const FADE_TIME = 150; // ms
  const TYPING_TIMER_LENGTH = 400; // ms
  const COLORS = [
    '#e21400',
    '#91580f',
    '#f8a700',
    '#f78b00',
    '#58dc00',
    '#287b00',
    '#a8f07a',
    '#4ae8c4',
    '#3b88eb',
    '#3824aa',
    '#a700ff',
    '#d300e7',
  ];

  // Initialize variables
  const $window = $(window);
  let $usernameInput = $('.usernameInput'); // Input for username
  let $messages = $('.messages'); // Messages area
  let $inputMessage = $('.inputMessage'); // Input message input box

  const $loginPage = $('.login.page'); // The login page
  const $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  let selfUsername;
  let connected = false;
  let typing = false;
  let lastTypingTime;
  let $currentInput = $usernameInput.focus();

  const socket = new WebSocket('ws://' + document.location.host + '/ws');

  const addParticipantsMessage = (numUsers) => {
    let message = '';
    if (numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += 'there are ' + numUsers + ' participants';
    }
    log(message);
  };

  // Sets the client's username
  const setUsername = () => {
    selfUsername = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (selfUsername) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.send(
        JSON.stringify({ eventType: 'add user', username: selfUsername })
      );
    }
  };

  // Sends a chat message
  const sendMessage = () => {
    let message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: selfUsername,
        message: message,
      });
      // tell server to execute 'new message' and send along one parameter
      socket.send(JSON.stringify({ eventType: 'new message', message }));
    }
  };

  // Log a message
  const log = (message, options) => {
    let $el = $('<li>')
      .addClass('log')
      .text(message);
    addMessageElement($el, options);
  };

  // Adds the visual chat message to the message list
  const addChatMessage = (data, options) => {
    // Don't fade the message in if there is an 'X was typing'
    let $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    let $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    let $messageBodyDiv = $('<span class="messageBody">').text(data.message);

    let typingClass = data.typing ? 'typing' : '';
    let $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  };

  // Adds the visual chat typing message
  const addChatTyping = (data) => {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  };

  // Removes the visual chat typing message
  const removeChatTyping = (data) => {
    getTypingMessages(data).fadeOut(function() {
      $(this).remove();
    });
  };

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  const addMessageElement = (el, options) => {
    let $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  };

  // Prevents input from having injected markup
  const cleanInput = (input) => {
    return $('<div/>')
      .text(input)
      .html();
  };

  // Updates the typing event
  const updateTyping = () => {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.send(
          JSON.stringify({ eventType: 'typing', username: selfUsername })
        );
      }
      lastTypingTime = new Date().getTime();

      setTimeout(() => {
        const typingTimer = new Date().getTime();
        const timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.send(
            JSON.stringify({ eventType: 'stop typing', username: selfUsername })
          );
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  };

  // Gets the 'X is typing' messages of a user
  const getTypingMessages = (data) => {
    return $('.typing.message').filter(function(i) {
      return $(this).data('username') === data.username;
    });
  };

  // Gets the color of a username through our hash function
  const getUsernameColor = (username) => {
    // Compute hash code
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    const index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  };

  // Keyboard events

  $window.keydown((event) => {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (selfUsername) {
        sendMessage();
        socket.send(
          JSON.stringify({ eventType: 'stop typing', username: selfUsername })
        );
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', () => {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(() => {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(() => {
    $inputMessage.focus();
  });

  // Socket events

  socket.onopen = (evt) => {
    console.log('websocket connected');
  };

  socket.onerror = (evt) => {
    log('connection error');
  };

  socket.onclose = (evt) => {
    log('you have been disconnected');
  };

  socket.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    console.dir(data);
    const { eventType, username, message } = data;
    if (!eventType) {
      return;
    }
    switch (eventType) {
      case 'add user':
        connected = true;
        // Display the welcome message
        const welcomeMsg = 'Welcome to Socket.IO Chat – ';
        log(welcomeMsg, {
          prepend: true,
        });
        addParticipantsMessage(1);
        if (username != selfUsername) {
          log(username + ' joined');
          addParticipantsMessage(1);
        }
        break;
      case 'new message':
        addChatMessage({ username: selfUsername, message });
        break;
      // case 'user left':
      //   break;
      case 'typing':
        addChatTyping({ username: selfUsername });
        break;
      case 'stop typing':
        removeChatTyping({ username: selfUsername });
        break;

      default:
        break;
    }
  };
});
