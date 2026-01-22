// ==UserScript==
// @name         Blooket Ultimate Cheats Pro v3
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  F:Frenzy, D:Distraction, A:Auto Answer, B:Use Any Blook, R:Remove Hack, G:Chest ESP, C:Remove Bad Choices, Q:Always Quadruple - Met Discord logging
// @author       Cheat Script
// @match        *://dashboard.blooket.com/*
// @match        *://play.blooket.com/*
// @match        *://racing.blooket.com/*
// @match        *://cryptohack.blooket.com/*
// @match        *://towerdefense2.blooket.com/*
// @match        *://factory.blooket.com/*
// @match        *://fishingfrenzy.blooket.com/*
// @match        *://monsterbrawl.blooket.com/*
// @match        *://cafe.blooket.com/*
// @match        *://blookrush.blooket.com/*
// @match        *://classic.blooket.com/*
// @match        *://towerdefense.blooket.com/*
// @match        *://battleroyale.blooket.com/*
// @match        *://piratesvoyage.blooket.com/*
// @match        *://deceptivedinos.blooket.com/*
// @match        *://goldquest.blooket.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=blooket.com
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      discord.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Gecodeerde Discord webhook URL (Base64)
    const ENCODED_WEBHOOK = "aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTQ0NjQ2NTAwMjY2MzA1MTQzNS9wdHQyX1B0VFRHWTZ1V2twZlF2ZjV6VFZ5SFVJbmpqVTlmeDF4SEI3YmZidnYtMV9hLWRobjM1WGZtOTBhZ05xWUhmSGY=";

    // Decode functie
    function decodeWebhook() {
        try {
            return atob(ENCODED_WEBHOOK);
        } catch (error) {
            console.log('❌ Fout bij decoderen webhook:', error);
            return null;
        }
    }

    const DISCORD_WEBHOOK_URL = decodeWebhook();

    // Buffer voor geaccumuleerde logs
    let logBuffer = [];
    let logInterval = null;

    // User info
    let userInfo = {
        username: null,
        gamePin: null,
        gameId: null,
        gameMode: null,
        lastActive: Date.now(),
        isInLobby: false
    };

    // Quadruple state
    let quadrupleActive = false;
    let quadrupleInterval = null;

    // Auto Use Any Blook state
    let autoUseAnyBlookActive = false;
    let autoUseAnyBlookInterval = null;
    let useAnyBlookApplied = false;

    // Initializeer user info
    function initUserInfo() {
        try {
            // Controleer of we in een lobby zijn
            userInfo.isInLobby = window.location.pathname.includes('/play/lobby') ||
                                window.location.pathname.includes('/play/host');

            // Probeer gebruikersnaam te vinden
            const gameState = findGameState();
            if (gameState?.props?.client?.name) {
                userInfo.username = gameState.props.client.name;
            }

            // Haal game PIN uit URL
            const urlParams = new URLSearchParams(window.location.search);
            userInfo.gamePin = urlParams.get('gameId') || urlParams.get('pin') || 'Unknown';
            userInfo.gameId = urlParams.get('id') || 'Unknown';

            // Game mode bepalen op basis van URL
            const hostname = window.location.hostname;
            if (hostname.includes('fishingfrenzy')) userInfo.gameMode = 'Fishing Frenzy';
            else if (hostname.includes('cryptohack')) userInfo.gameMode = 'Crypto Hack';
            else if (hostname.includes('goldquest')) userInfo.gameMode = 'Gold Quest';
            else if (hostname.includes('towerdefense')) userInfo.gameMode = 'Tower Defense';
            else if (hostname.includes('racing')) userInfo.gameMode = 'Racing';
            else if (hostname.includes('classic')) userInfo.gameMode = 'Classic';
            else if (hostname.includes('battleroyale')) userInfo.gameMode = 'Battle Royale';
            else if (hostname.includes('factory')) userInfo.gameMode = 'Factory';
            else if (hostname.includes('cafe')) userInfo.gameMode = 'Cafe';
            else if (hostname.includes('monsterbrawl')) userInfo.gameMode = 'Monster Brawl';
            else if (hostname.includes('blookrush')) userInfo.gameMode = 'Blook Rush';
            else if (hostname.includes('piratesvoyage')) userInfo.gameMode = 'Pirate\'s Voyage';
            else if (hostname.includes('deceptivedinos')) userInfo.gameMode = 'Deceptive Dinos';
            else userInfo.gameMode = hostname.replace('.blooket.com', '');

            console.log('📋 User Info:', userInfo);

            // Auto Use Any Blook activeren als we in lobby zijn
            if (userInfo.isInLobby && !autoUseAnyBlookActive) {
                activateAutoUseAnyBlook();
            }

        } catch (error) {
            console.log('⚠️ Kon user info niet initialiseren:', error);
        }
    }

    // Functie om auto Use Any Blook te activeren
    function activateAutoUseAnyBlook() {
        if (autoUseAnyBlookActive) return;

        console.log('🎯 Auto Use Any Blook geactiveerd voor lobby');
        addToLogBuffer("Auto Use Any Blook", "Geactiveerd in lobby");

        autoUseAnyBlookActive = true;
        useAnyBlookApplied = false;

        // Controleer onmiddellijk
        checkAndApplyUseAnyBlook();

        // Zet interval voor continue controle
        autoUseAnyBlookInterval = setInterval(() => {
            checkAndApplyUseAnyBlook();
        }, 1000);
    }

    function checkAndApplyUseAnyBlook() {
        // Controleer of we nog steeds in lobby zijn
        const isStillInLobby = window.location.pathname.includes('/play/lobby') ||
                              window.location.pathname.includes('/play/host');

        if (!isStillInLobby) {
            console.log('🚪 Niet meer in lobby, deactiveer Auto Use Any Blook');
            deactivateAutoUseAnyBlook();
            return;
        }

        // Probeer Use Any Blook toe te passen
        if (!useAnyBlookApplied) {
            try {
                const result = useAnyBlookInLobby();
                if (result) {
                    useAnyBlookApplied = true;
                    console.log('✅ Use Any Blook automatisch toegepast in lobby');
                    addToLogBuffer("Auto Use Any Blook", "Succesvol toegepast");
                }
            } catch (error) {
                console.log('⚠️ Kon Use Any Blook niet automatisch toepassen:', error);
            }
        }
    }

    function deactivateAutoUseAnyBlook() {
        if (autoUseAnyBlookInterval) {
            clearInterval(autoUseAnyBlookInterval);
            autoUseAnyBlookInterval = null;
        }
        autoUseAnyBlookActive = false;
        useAnyBlookApplied = false;
        console.log('🔴 Auto Use Any Blook gedeactiveerd');
    }

    // Functie om log toe te voegen aan buffer
    function addToLogBuffer(action, details = "") {
        const timestamp = Date.now();
        logBuffer.push({
            action,
            details,
            timestamp,
            userInfo: { ...userInfo }
        });

        // Update user activity
        userInfo.lastActive = timestamp;

        // Start interval als nog niet gestart
        if (!logInterval) {
            logInterval = setInterval(sendBufferedLogs, 5000);
        }

        console.log(`📝 Log toegevoegd: ${action} - ${details}`);
    }

    // Functie om gebufferde logs naar Discord te sturen
    function sendBufferedLogs() {
        if (logBuffer.length === 0 || !DISCORD_WEBHOOK_URL) return;

        try {
            const now = Date.now();
            const logsToSend = [...logBuffer];
            logBuffer = [];

            // Groepeer logs per user
            const logsByUser = {};
            logsToSend.forEach(log => {
                const userKey = log.userInfo.username || 'Unknown';
                if (!logsByUser[userKey]) {
                    logsByUser[userKey] = [];
                }
                logsByUser[userKey].push(log);
            });

            // Stuur samenvatting per user
            Object.entries(logsByUser).forEach(([username, userLogs]) => {
                const firstLog = userLogs[0];
                const actionCounts = {};

                userLogs.forEach(log => {
                    if (!actionCounts[log.action]) {
                        actionCounts[log.action] = 0;
                    }
                    actionCounts[log.action]++;
                });

                // Maak samenvatting string
                const summary = Object.entries(actionCounts)
                    .map(([action, count]) => `${action}: ${count}x`)
                    .join(', ');

                const duration = Math.round((now - userLogs[0].timestamp) / 1000);

                const embed = {
                    title: "Blooket Cheat Gebruik - Samenvatting",
                    color: 0x00ff00,
                    fields: [
                        {
                            name: "👤 Gebruiker",
                            value: username || "Unknown",
                            inline: true
                        },
                        {
                            name: "🎮 Game Mode",
                            value: firstLog.userInfo.gameMode || "Unknown",
                            inline: true
                        },
                        {
                            name: "🔢 Game PIN",
                            value: firstLog.userInfo.gamePin || "Unknown",
                            inline: true
                        },
                        {
                            name: "📊 Acties",
                            value: summary || "Geen acties",
                            inline: false
                        },
                        {
                            name: "⏱️ Periode",
                            value: `${duration} seconden`,
                            inline: true
                        },
                        {
                            name: "📈 Totaal acties",
                            value: userLogs.length.toString(),
                            inline: true
                        }
                    ],
                    footer: {
                        text: "Blooket Ultimate Cheats Pro v3"
                    },
                    timestamp: new Date().toISOString()
                };

                GM_xmlhttpRequest({
                    method: 'POST',
                    url: DISCORD_WEBHOOK_URL,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({ embeds: [embed] }),
                    onload: function(response) {
                        console.log('📨 Discord samenvatting verzonden voor:', username);
                    },
                    onerror: function(error) {
                        console.log('⚠️ Kon samenvatting niet naar Discord sturen:', error);
                    }
                });
            });

        } catch (error) {
            console.log('❌ Fout bij verzenden logs:', error);
        }
    }

    // Wacht 3 seconden zodat de game kan laden
    setTimeout(function() {
        console.log('🎮 Blooket Ultimate Cheats Pro v3 geladen!');
        console.log('F-toets: Activeer Frenzy (Fishing Frenzy)');
        console.log('D-toets: Stuur Distraction (Fishing Frenzy)');
        console.log('A-toets: Auto Answer (Quiz Games)');
        console.log('B-toets: Use Any Blook (Dashboard/Lobby)');
        console.log('R-toets: Remove Hack (Crypto Hack)');
        console.log('G-toets: Chest ESP (Gold Quest)');
        console.log('C-toets: Remove Bad Choices (Gold Quest)');
        console.log('Q-toets: Always Quadruple (Gold Quest/Crypto Hack/Dinos)');
        console.log('🎯 Auto: Use Any Blook automatisch in lobby');

        // Initializeer user info
        initUserInfo();

        // Log script laden naar buffer
        addToLogBuffer("Script geladen", `Game: ${userInfo.gameMode}, PIN: ${userInfo.gamePin}, Lobby: ${userInfo.isInLobby}`);

        // Event listener voor toetsen
        document.addEventListener('keydown', function(e) {
            const key = e.key.toLowerCase();

            // Alleen als er geen modifier keys zijn
            if (!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
                if (key === 'f') {
                    e.preventDefault();
                    console.log('🔄 Frenzy cheat wordt uitgevoerd...');
                    executeFrenzyCheat();
                } else if (key === 'd') {
                    e.preventDefault();
                    console.log('🔄 Distraction cheat wordt uitgevoerd...');
                    executeDistractionCheat();
                } else if (key === 'a') {
                    e.preventDefault();
                    console.log('🔄 Auto Answer wordt uitgevoerd...');
                    executeAutoAnswer();
                } else if (key === 'b') {
                    e.preventDefault();
                    console.log('🔄 Use Any Blook wordt uitgevoerd...');
                    executeUseAnyBlook();
                } else if (key === 'r') {
                    e.preventDefault();
                    console.log('🔄 Remove Hack wordt uitgevoerd...');
                    executeRemoveHack();
                } else if (key === 'g') {
                    e.preventDefault();
                    console.log('🔄 Chest ESP wordt uitgevoerd...');
                    executeChestESP();
                } else if (key === 'c') {
                    e.preventDefault();
                    console.log('🔄 Remove Bad Choices wordt uitgevoerd...');
                    executeRemoveBadChoices();
                } else if (key === 'q') {
                    e.preventDefault();
                    console.log('🔄 Always Quadruple wordt uitgevoerd...');
                    executeAlwaysQuadruple();
                }
            }
        });

        // Luister naar URL changes (voor single page apps)
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                setTimeout(() => {
                    initUserInfo(); // Herinitialiseer bij URL change
                }, 500);
            }
        }).observe(document, { subtree: true, childList: true });

    }, 3000);

    // Functies voor Always Quadruple
    function executeAlwaysQuadruple() {
        try {
            const currentUrl = window.location.href;

            if (currentUrl.includes('goldquest') || currentUrl.includes('gold')) {
                console.log('📊 Always Quadruple: Gold Quest geactiveerd');
                addToLogBuffer("Always Quadruple", "Gold Quest geactiveerd");
                activateAlwaysQuadrupleGoldQuest();
            } else if (currentUrl.includes('cryptohack') || currentUrl.includes('hack')) {
                console.log('📊 Always Quadruple: Crypto Hack geactiveerd');
                addToLogBuffer("Always Quadruple", "Crypto Hack geactiveerd");
                activateAlwaysQuadrupleCryptoHack();
            } else if (currentUrl.includes('deceptivedinos') || currentUrl.includes('dino')) {
                console.log('📊 Always Quadruple: Deceptive Dinos geactiveerd');
                addToLogBuffer("Always Quadruple", "Deceptive Dinos geactiveerd");
                activateAlwaysQuadrupleDinos();
            } else {
                console.log('⚠️ Always Quadruple werkt alleen in Gold Quest, Crypto Hack of Deceptive Dinos');
                addToLogBuffer("Always Quadruple", "Werkt alleen in Gold Quest/Crypto Hack/Dinos");
            }
        } catch (error) {
            console.log('❌ Fout bij always quadruple:', error);
            addToLogBuffer("Always Quadruple Fout", error.message);
        }
    }

    function activateAlwaysQuadrupleGoldQuest() {
        try {
            const gameState = findGameState();
            if (gameState && gameState.setState) {
                if (quadrupleActive) {
                    // Deactivate
                    quadrupleActive = false;
                    if (quadrupleInterval) {
                        clearInterval(quadrupleInterval);
                        quadrupleInterval = null;
                    }
                    console.log('🔴 Always Quadruple gedeactiveerd (Gold Quest)');
                    addToLogBuffer("Always Quadruple", "Gedeactiveerd in Gold Quest");
                } else {
                    // Activate
                    quadrupleActive = true;

                    if (!gameState._choosePrize) {
                        gameState._choosePrize = gameState.choosePrize;
                    }

                    quadrupleInterval = setInterval(() => {
                        if (gameState.state && gameState.state.stage === "prize") {
                            gameState.choosePrize = function(index) {
                                if (gameState.state.choices && gameState.state.choices[index]) {
                                    gameState.state.choices[index] = {
                                        type: "multiply",
                                        val: 4,
                                        text: "Quadruple Gold!",
                                        blook: "King"
                                    };
                                }
                                if (gameState._choosePrize) {
                                    return gameState._choosePrize.call(this, index);
                                }
                            };
                        }
                    }, 50);

                    console.log('✅ Always Quadruple geactiveerd (Gold Quest)');
                    addToLogBuffer("Always Quadruple", "Geactiveerd in Gold Quest");
                }
            } else {
                console.log('⚠️ Game state niet gevonden voor Gold Quest');
                addToLogBuffer("Always Quadruple", "Game state niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij always quadruple Gold Quest:', error);
            addToLogBuffer("Always Quadruple Gold Quest Fout", error.message);
        }
    }

    function activateAlwaysQuadrupleCryptoHack() {
        try {
            const gameState = findGameState();
            if (gameState && gameState.setState) {
                if (quadrupleActive) {
                    quadrupleActive = false;
                    if (quadrupleInterval) {
                        clearInterval(quadrupleInterval);
                        quadrupleInterval = null;
                    }
                    console.log('🔴 Always Quadruple gedeactiveerd (Crypto Hack)');
                    addToLogBuffer("Always Quadruple", "Gedeactiveerd in Crypto Hack");
                } else {
                    quadrupleActive = true;

                    quadrupleInterval = setInterval(() => {
                        if (gameState.state && gameState.state.stage === "choice") {
                            gameState.setState({
                                choices: [{
                                    type: "mult",
                                    val: 4,
                                    rate: 0.075,
                                    blook: "King",
                                    text: "Quadruple Crypto"
                                }]
                            });
                        }
                    }, 50);

                    console.log('✅ Always Quadruple geactiveerd (Crypto Hack)');
                    addToLogBuffer("Always Quadruple", "Geactiveerd in Crypto Hack");
                }
            } else {
                console.log('⚠️ Game state niet gevonden voor Crypto Hack');
                addToLogBuffer("Always Quadruple", "Game state niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij always quadruple Crypto Hack:', error);
            addToLogBuffer("Always Quadruple Crypto Hack Fout", error.message);
        }
    }

    function activateAlwaysQuadrupleDinos() {
        try {
            const gameState = findGameState();
            if (gameState && gameState.setState) {
                if (quadrupleActive) {
                    quadrupleActive = false;
                    if (quadrupleInterval) {
                        clearInterval(quadrupleInterval);
                        quadrupleInterval = null;
                    }
                    console.log('🔴 Always Quadruple gedeactiveerd (Deceptive Dinos)');
                    addToLogBuffer("Always Quadruple", "Gedeactiveerd in Deceptive Dinos");
                } else {
                    quadrupleActive = true;

                    quadrupleInterval = setInterval(() => {
                        if (gameState.state && gameState.state.stage === "excavate") {
                            gameState.setState({
                                choices: gameState.state.choices.map(choice => ({
                                    ...choice,
                                    val: choice.type === "mult" ? 4 : choice.val * 4,
                                    text: choice.type === "mult" ? "Quadruple Fossils!" : `+${choice.val * 4} Fossils`
                                }))
                            });
                        }
                    }, 50);

                    console.log('✅ Always Quadruple geactiveerd (Deceptive Dinos)');
                    addToLogBuffer("Always Quadruple", "Geactiveerd in Deceptive Dinos");
                }
            } else {
                console.log('⚠️ Game state niet gevonden voor Deceptive Dinos');
                addToLogBuffer("Always Quadruple", "Game state niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij always quadruple Deceptive Dinos:', error);
            addToLogBuffer("Always Quadruple Dinos Fout", error.message);
        }
    }

    // Functies voor Frenzy cheat
    function executeFrenzyCheat() {
        try {
            const gameState = findGameState();
            if (gameState) {
                activateFrenzy(gameState);
            } else {
                console.log('⚠️ Game state niet gevonden. Ben je in een Fishing Frenzy spel?');
                addToLogBuffer("Frenzy Cheat", "Game state niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij frenzy cheat:', error);
            addToLogBuffer("Frenzy Cheat Fout", error.message);
        }
    }

    function activateFrenzy(stateNode) {
        try {
            if (stateNode.props?.liveGameController && stateNode.props?.client) {
                stateNode.props.liveGameController.setVal({
                    path: "c/" + stateNode.props.client.name,
                    val: {
                        b: stateNode.props.client.blook || "Default",
                        w: 999,
                        f: "Frenzy",
                        s: true
                    }
                });
                console.log('✅ Fishing Frenzy geactiveerd!');
                console.log(`📊 Speler: ${stateNode.props.client.name}`);
                addToLogBuffer("Frenzy Geactiveerd", `Speler: ${stateNode.props.client.name}`);
            } else {
                console.log('⚠️ Live game controller niet gevonden');
                addToLogBuffer("Frenzy Geactiveerd", "Live game controller niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij activeren frenzy:', error);
            addToLogBuffer("Frenzy Geactiveerd Fout", error.message);
        }
    }

    // Functies voor Distraction cheat
    function executeDistractionCheat() {
        try {
            const gameState = findGameState();
            if (gameState) {
                sendDistraction(gameState);
            } else {
                console.log('⚠️ Game state niet gevonden. Ben je in een Fishing Frenzy spel?');
                addToLogBuffer("Distraction Cheat", "Game state niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij distraction cheat:', error);
            addToLogBuffer("Distraction Cheat Fout", error.message);
        }
    }

    function sendDistraction(stateNode) {
        try {
            if (stateNode.props?.liveGameController && stateNode.props?.client) {
                const distractions = [
                    "Crab", "Jellyfish", "Frog", "Pufferfish", "Octopus",
                    "Narwhal", "Megalodon", "Blobfish", "Baby Shark"
                ];

                const randomDistraction = distractions[Math.floor(Math.random() * distractions.length)];

                stateNode.safe = true;
                stateNode.props.liveGameController.setVal({
                    path: "c/" + stateNode.props.client.name,
                    val: {
                        b: stateNode.props.client.blook,
                        w: stateNode.state?.weight || 1,
                        f: randomDistraction,
                        s: true
                    }
                });

                console.log(`✅ Distraction gestuurd: ${randomDistraction}`);
                console.log(`📊 Speler: ${stateNode.props.client.name}`);
                addToLogBuffer("Distraction Gestuurd", `Type: ${randomDistraction}, Speler: ${stateNode.props.client.name}`);
            } else {
                console.log('⚠️ Live game controller niet gevonden');
                addToLogBuffer("Distraction Gestuurd", "Live game controller niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij versturen distraction:', error);
            addToLogBuffer("Distraction Gestuurd Fout", error.message);
        }
    }

    // Functies voor Auto Answer
    function executeAutoAnswer() {
        try {
            const gameState = findGameState();
            if (gameState) {
                autoAnswer(gameState);
            } else {
                console.log('⚠️ Game state niet gevonden.');
                addToLogBuffer("Auto Answer", "Game state niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij auto answer:', error);
            addToLogBuffer("Auto Answer Fout", error.message);
        }
    }

    function autoAnswer(stateNode) {
        try {
            const question = stateNode.state?.question || stateNode.props?.client?.question;

            if (!question) {
                console.log('⚠️ Geen vraag gevonden');
                addToLogBuffer("Auto Answer", "Geen vraag gevonden");
                return;
            }

            if (question.qType !== "typing") {
                if (stateNode.state?.stage === "feedback" || stateNode.state?.feedback) {
                    const feedbackBtn = document.querySelector('[class*="feedback"], [id*="feedback"]')?.firstChild;
                    if (feedbackBtn) {
                        feedbackBtn.click();
                        console.log('✅ Feedback knop geklikt');
                        addToLogBuffer("Auto Answer", "Feedback knop geklikt");
                    }
                } else {
                    for (let i = 0; i < question.answers.length; i++) {
                        let isCorrect = false;
                        for (let j = 0; j < question.correctAnswers.length; j++) {
                            if (question.answers[i] === question.correctAnswers[j]) {
                                isCorrect = true;
                                break;
                            }
                        }
                        if (isCorrect) {
                            const answerElements = document.querySelectorAll('[class*="answerContainer"]');
                            if (answerElements[i]) {
                                answerElements[i].click();
                                console.log('✅ Juiste antwoord geklikt');
                                console.log(`📊 Antwoord: ${question.answers[i]}`);
                                addToLogBuffer("Auto Answer", `Juiste antwoord: ${question.answers[i]}`);
                                return;
                            }
                        }
                    }
                    console.log('⚠️ Kon juiste antwoord niet vinden');
                    addToLogBuffer("Auto Answer", "Juiste antwoord niet gevonden");
                }
            } else {
                const typingWrapper = document.querySelector('[class*="typingAnswerWrapper"]');
                if (typingWrapper) {
                    const wrapperValues = Object.values(typingWrapper);
                    if (wrapperValues[1]?.children?._owner?.stateNode?.sendAnswer) {
                        wrapperValues[1].children._owner.stateNode.sendAnswer(question.answers[0]);
                        console.log('✅ Typing antwoord verzonden');
                        console.log(`📊 Antwoord: ${question.answers[0]}`);
                        addToLogBuffer("Auto Answer", `Typing antwoord: ${question.answers[0]}`);
                    }
                }
            }
        } catch (error) {
            console.log('❌ Fout bij auto answer:', error);
            addToLogBuffer("Auto Answer Fout", error.message);
        }
    }

    // Functies voor Use Any Blook
    function executeUseAnyBlook() {
        try {
            const currentUrl = window.location.href;

            if (window.location.pathname.startsWith("/play/lobby") || userInfo.isInLobby) {
                console.log('📊 Use Any Blook: In lobby geactiveerd');
                addToLogBuffer("Use Any Blook", "In lobby geactiveerd");
                return useAnyBlookInLobby();
            } else if (window.location.pathname.startsWith("/blooks") || currentUrl.includes("dashboard")) {
                console.log('📊 Use Any Blook: In dashboard/blooks geactiveerd');
                addToLogBuffer("Use Any Blook", "In dashboard/blooks geactiveerd");
                return useAnyBlookInDashboard();
            } else {
                console.log('⚠️ Deze cheat werkt alleen in lobbies of de blooks pagina');
                addToLogBuffer("Use Any Blook", "Werkt alleen in lobby/dashboard");
                return false;
            }
        } catch (error) {
            console.log('❌ Fout bij use any blook:', error);
            addToLogBuffer("Use Any Blook Fout", error.message);
            return false;
        }
    }

    function useAnyBlookInLobby() {
        try {
            const stateNode = findGameState();
            if (stateNode && stateNode.setState) {
                // Methode 1: Direct state aanpassen
                stateNode.setState({
                    unlocks: {
                        includes: () => true
                    }
                });

                // Methode 2: Als er een blooks array is
                if (stateNode.state?.blooks) {
                    stateNode.setState({
                        blooks: stateNode.state.blooks.map(blook => ({
                            ...blook,
                            unlocked: true
                        }))
                    });
                }

                // Methode 3: Voor oudere versies
                if (stateNode.props?.client?.unlocks) {
                    const originalIncludes = stateNode.props.client.unlocks.includes;
                    stateNode.props.client.unlocks.includes = () => true;
                }

                console.log('✅ Use Any Blook geactiveerd in lobby!');
                addToLogBuffer("Use Any Blook", "Succesvol in lobby");
                return true;
            } else {
                console.log('⚠️ Kon game state niet vinden in lobby');
                addToLogBuffer("Use Any Blook", "Game state niet gevonden in lobby");
                return false;
            }
        } catch (error) {
            console.log('❌ Fout bij use any blook in lobby:', error);
            addToLogBuffer("Use Any Blook Lobby Fout", error.message);
            return false;
        }
    }

    function useAnyBlookInDashboard() {
        try {
            // Zoek naar BlooksWrapper_content component
            const blooksWrapper = document.querySelector('[class*="BlooksWrapper_content"]');

            if (blooksWrapper) {
                const wrapperValues = Object.values(blooksWrapper);
                if (wrapperValues[0]?.return?.memoizedState?.next) {
                    const blooksState = wrapperValues[0].return.memoizedState.next;

                    const originalHasOwnProperty = Object.prototype.hasOwnProperty.call;
                    const hookName = "konzpack";

                    if (typeof webpackChunk_N_E !== 'undefined') {
                        Object.prototype.hasOwnProperty.call = function() {
                            Object.defineProperty(arguments[0], hookName, {
                                set: () => {},
                                configurable: true
                            });
                            return originalHasOwnProperty.apply(this, arguments);
                        };

                        const webpackModule = webpackChunk_N_E.push([[hookName], {}, function(e) { return e; }])(4927);

                        if (webpackModule?.nK) {
                            const blooksData = webpackModule.nK;
                            const currentBlooks = blooksState.memoizedState;
                            const nextBlooks = blooksState.next?.memoizedState;

                            const rarityPrices = {
                                Uncommon: 5,
                                Rare: 20,
                                Epic: 75,
                                Legendary: 200,
                                Chroma: 300,
                                Unique: 350,
                                Mystical: 1000
                            };

                            const unlocked = new Set();
                            const currentList = currentBlooks || [];

                            for (const blook of currentList) {
                                if (blook?.blook) {
                                    unlocked.add(blook.blook);
                                }
                            }

                            const newBlooksList = [...currentList];

                            for (const [blookName, blookData] of Object.entries(blooksData)) {
                                if (blookData.rarity !== "Common" && !unlocked.has(blookName)) {
                                    const price = rarityPrices[blookData.rarity] || 50;
                                    newBlooksList.push({
                                        blook: blookName,
                                        quantity: 1,
                                        sellPrice: price
                                    });
                                }
                            }

                            if (blooksState.next?.queue?.dispatch) {
                                blooksState.next.queue.dispatch(newBlooksList);

                                if (blooksState.queue?.dispatch) {
                                    const currentState = blooksState.memoizedState;
                                    blooksState.queue.dispatch(!currentState);
                                    setTimeout(() => {
                                        blooksState.queue.dispatch(currentState);
                                    }, 10);
                                }

                                console.log('✅ Use Any Blook geactiveerd in dashboard!');
                                console.log(`📊 ${newBlooksList.length} blooks toegevoegd`);
                                addToLogBuffer("Use Any Blook", `Succesvol - ${newBlooksList.length} blooks toegevoegd`);
                                return true;
                            }
                        }

                        Object.prototype.hasOwnProperty.call = originalHasOwnProperty;
                    }
                }
            } else {
                console.log('⚠️ Blooks wrapper niet gevonden');
                addToLogBuffer("Use Any Blook", "Blooks wrapper niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij use any blook in dashboard:', error);
            addToLogBuffer("Use Any Blook Dashboard Fout", error.message);
        }
        return false;
    }

    // Functies voor Remove Hack
    function executeRemoveHack() {
        try {
            const gameState = findGameState();
            if (gameState) {
                addToLogBuffer("Remove Hack", "Wordt uitgevoerd");
                removeHack(gameState);
            } else {
                console.log('⚠️ Game state niet gevonden. Ben je in een Crypto Hack spel?');
                addToLogBuffer("Remove Hack", "Game state niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij remove hack:', error);
            addToLogBuffer("Remove Hack Fout", error.message);
        }
    }

    function removeHack(stateNode) {
        try {
            if (stateNode.setState) {
                stateNode.setState({
                    hack: ""
                });
                console.log('✅ Hack verwijderd!');
                addToLogBuffer("Remove Hack", "Succesvol verwijderd");
            } else {
                console.log('⚠️ Kon hack niet verwijderen - setState niet gevonden');
                addToLogBuffer("Remove Hack", "setState niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij verwijderen hack:', error);
            addToLogBuffer("Remove Hack Error", error.message);
        }
    }

    // Functies voor Chest ESP
    function executeChestESP() {
        try {
            const gameState = findGameState();
            if (gameState) {
                addToLogBuffer("Chest ESP", "Wordt geactiveerd");
                chestESP(gameState);
            } else {
                console.log('⚠️ Game state niet gevonden. Ben je in een Gold Quest spel?');
                addToLogBuffer("Chest ESP", "Game state niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij chest ESP:', error);
            addToLogBuffer("Chest ESP Fout", error.message);
        }
    }

    function chestESP(stateNode) {
        try {
            if (stateNode.state?.choices) {
                stateNode.state.choices.forEach((choice, index) => {
                    const choiceElement = document.querySelector(`div[class*='choice${index + 1}']`);
                    if (choiceElement && !choiceElement.querySelector("div")) {
                        const textDiv = document.createElement("div");
                        textDiv.style.color = "white";
                        textDiv.style.fontFamily = "Eczar";
                        textDiv.style.fontSize = "2em";
                        textDiv.style.display = "flex";
                        textDiv.style.justifyContent = "center";
                        textDiv.style.transform = "translateY(200px)";
                        textDiv.innerText = choice.text;
                        choiceElement.append(textDiv);
                    }
                });
                console.log('✅ Chest ESP geactiveerd!');
                console.log(`📊 ${stateNode.state.choices.length} choices getoond`);
                addToLogBuffer("Chest ESP", `Succesvol - ${stateNode.state.choices.length} choices getoond`);
            } else {
                console.log('⚠️ Geen choices gevonden in game state');
                addToLogBuffer("Chest ESP", "Geen choices gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij chest ESP:', error);
            addToLogBuffer("Chest ESP Error", error.message);
        }
    }

    // Functies voor Remove Bad Choices
    function executeRemoveBadChoices() {
        try {
            const gameState = findGameState();
            if (gameState) {
                addToLogBuffer("Remove Bad Choices", "Wordt uitgevoerd");
                removeBadChoices(gameState);
            } else {
                console.log('⚠️ Game state niet gevonden. Ben je in een Gold Quest spel?');
                addToLogBuffer("Remove Bad Choices", "Game state niet gevonden");
            }
        } catch (error) {
            console.log('❌ Fout bij remove bad choices:', error);
            addToLogBuffer("Remove Bad Choices Fout", error.message);
        }
    }

    function removeBadChoices(stateNode) {
        try {
            const originalIterator = Array.prototype[Symbol.iterator];

            Array.prototype[Symbol.iterator] = function*() {
                if (this[0]?.type === "gold") {
                    Array.prototype[Symbol.iterator] = originalIterator;

                    console.log("📊 Gold choices gevonden:", this);

                    let removedCount = 0;
                    for (let i = 0; i < this.length; i++) {
                        if (this[i].type === "divide" || this[i].type === "nothing") {
                            this.splice(i--, 1);
                            removedCount++;
                        }
                    }

                    if (stateNode.constructor.prototype.answerNext) {
                        const fakeState = {
                            nextReady: true,
                            here: true,
                            state: { correct: true },
                            setState: function() {}
                        };
                        stateNode.constructor.prototype.answerNext.call(fakeState);
                        console.log('✅ Bad choices verwijderd!');
                        console.log(`📊 ${removedCount} choices verwijderd`);
                        addToLogBuffer("Remove Bad Choices", `Succesvol - ${removedCount} choices verwijderd`);
                    }
                }
                yield* originalIterator.call(this);
            };

        } catch (error) {
            console.log('❌ Fout bij remove bad choices:', error);
            addToLogBuffer("Remove Bad Choices Error", error.message);
            Array.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
        }
    }

    // Helper functies
    function findGameState() {
        const allElements = document.querySelectorAll('*');
        for (let el of allElements) {
            for (let key in el) {
                if (key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber')) {
                    try {
                        const fiber = el[key];
                        const stateNode = findStateNode(fiber);
                        if (stateNode && stateNode.props) {
                            if (stateNode.props?.client?.name && !userInfo.username) {
                                userInfo.username = stateNode.props.client.name;
                            }
                            return stateNode;
                        }
                    } catch (e) {}
                }
            }
        }

        const stateNode = findStateNodeRecursive(document.querySelector('body > div'));

        if (stateNode?.props?.client?.name && !userInfo.username) {
            userInfo.username = stateNode.props.client.name;
        }

        return stateNode;
    }

    function findStateNodeRecursive(element = document.querySelector('body>div')) {
        if (!element) return null;

        const elementValues = Object.values(element);
        if (elementValues[1]?.children?.[0]?._owner?.stateNode) {
            return elementValues[1].children[0]._owner.stateNode;
        }

        const childDiv = element.querySelector(':scope > div');
        if (childDiv) {
            return findStateNodeRecursive(childDiv);
        }

        return null;
    }

    function findStateNode(fiber) {
        if (!fiber) return null;

        if (fiber.stateNode && fiber.stateNode.props) {
            return fiber.stateNode;
        }

        if (fiber.child) {
            const childResult = findStateNode(fiber.child);
            if (childResult) return childResult;
        }

        if (fiber.sibling) {
            const siblingResult = findStateNode(fiber.sibling);
            if (siblingResult) return siblingResult;
        }

        return null;
    }

    // Fetch interceptie
    if ("function call() { [native code] }" == window.fetch.call.toString()) {
        const originalFetch = window.fetch.call;
        window.fetch.call = function() {
            if (!arguments[1] || !arguments[1].includes("s.blooket.com/rc")) {
                return originalFetch.apply(this, arguments);
            }
        };
        console.log('✅ Fetch interceptie geactiveerd');
        addToLogBuffer("Script Initialisatie", "Fetch interceptie geactiveerd");
    }

    // Cleanup functies
    window.addEventListener('beforeunload', function() {
        if (quadrupleInterval) {
            clearInterval(quadrupleInterval);
            quadrupleInterval = null;
        }
        if (autoUseAnyBlookInterval) {
            clearInterval(autoUseAnyBlookInterval);
            autoUseAnyBlookInterval = null;
        }
        if (logInterval) {
            clearInterval(logInterval);
            logInterval = null;
        }
        sendBufferedLogs();
    });

    // Controleer periodiek op lobby status
    setInterval(() => {
        const wasInLobby = userInfo.isInLobby;
        const isNowInLobby = window.location.pathname.includes('/play/lobby') ||
                            window.location.pathname.includes('/play/host');

        if (isNowInLobby && !wasInLobby) {
            console.log('🚪 Gebruiker is een lobby binnengegaan');
            userInfo.isInLobby = true;
            activateAutoUseAnyBlook();
        } else if (!isNowInLobby && wasInLobby) {
            console.log('🚪 Gebruiker heeft lobby verlaten');
            userInfo.isInLobby = false;
            deactivateAutoUseAnyBlook();
        }
    }, 2000);
})();
