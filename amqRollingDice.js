// ==UserScript==
// @name         AMQ Autoroll script
// @namespace    http://tampermonkey.net/
// @version      2025-05-20
// @description  Rolling Dice
// @author       You
// @icon         https://www.google.com/s2/favicons?sz=64&domain=animemusicquiz.com
// @match        https://*.animemusicquiz.com/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/JackyTam08/Roll-/main/amqRollingDice.user.js
// @updateURL    https://raw.githubusercontent.com/JackyTam08/Roll-/main/amqRollingDice.user.js
// ==/UserScript==

// 🎲 turn off list 🙏

(function () {
  'use strict';

  const loadInterval = setInterval(() => {
    if ($("#loadingScreen").hasClass("hidden")) {
        clearInterval(loadInterval);
        setupAutoroll();
    }
  }, 500);

  function setupAutoroll() {
    let autorollEnabled = false;

    new Listener("game chat update", (data) => {
      for (let message of data.messages) {
        if (message.sender === selfName && typeof message.message === "string") {
          const cmd = message.message.trim().toLowerCase();
          if (cmd === "/autoroll on") {
            autorollEnabled = true;
            gameChat.systemMessage("Autoroll enabled.");
          } else if (cmd === "/autoroll off") {
            autorollEnabled = false;
            gameChat.systemMessage("Autoroll disabled.");
          }
        }
      }
    }).bindListener();

    new Listener("join game", () => {
      autorollEnabled = false;
    }).bindListener();

    window.autorollThresholds = [2, 3, 5];

    new Listener("play next song", () => {
      if (!autorollEnabled) return;

      const players = Object.values(quiz.players).filter(p => !p.avatarDisabled).map(p => p.name);
      const total = players.length;

      let count = 0;
      for (let i = autorollThresholds.length - 1; i >= 0; i--) {
        if (total >= autorollThresholds[i]) {
          count = i + 1;
          break;
        }
      }

      if (count > 0 && total >= count) {
        const shuffled = players.slice();
        shuffleArray(shuffled);
        const picked = shuffled.slice(0, count);

        socket.sendCommand({
          type: "lobby",
          command: "game chat message",
          data: {
            msg: `🎲 ${picked.map(name => `@${name}`).join(", ")}`,
            teamMessage: false
          }
        });
      }
    }).bindListener();

    let knownPlayers = JSON.parse(localStorage.getItem("autoroll_knownPlayers") || "[]");

    new Listener("Game Starting", () => {
      if (!autorollEnabled) return;

      const currentPlayers = Object.values(lobby.players).map(p => p._name);
      const newPlayers = currentPlayers.filter(name => !knownPlayers.includes(name));

      if (newPlayers.length > 0) {
        socket.sendCommand({
          type: "lobby",
          command: "game chat message",
          data: {
            msg: "Each song the list of those who are allowed to answer is printed.",
            teamMessage: false
          }
        });

        for (const name of newPlayers) {
          knownPlayers.push(name);
        }
        localStorage.setItem("autoroll_knownPlayers", JSON.stringify(knownPlayers));
      }
    }).bindListener();
  }
})();
