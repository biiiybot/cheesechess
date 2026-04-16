const chatForm = document.getElementById("chatTextBox");
const messageInput = document.getElementById("message"); // Get the element once

chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    let messageText = messageInput.value; // Get the string

    if (messageText.trim() !== "") {
        sendInChat(`${playerUserName}: ${messageText}`);
        messageInput.value = ""; // Clear the actual input box
    }
});

socket.on("chatMessage", (data) => {
    const chatLog = document.getElementById("sidebarLog");
    chatLog.innerText = data;
    chatLog.scrollTop = chatLog.scrollHeight;
});

socket.on("updateUsers", (data) => {
    updateClients(data.pos);
    game.usersInGame = data.users;
    if (data.id === socket.id) {
        if (Object.values(game.usersInGame).includes(socket.id)) {
            myColor = Object.keys(game.usersInGame).find(k => game.usersInGame[k] === socket.id);
            rotBoard(myColor);
            resignButton();
            drawPieces();
            document.getElementById("chatName").textContent = playerUserName;
        }
    }
});