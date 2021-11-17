// ==UserScript==
// @name         TabunAva Reborn
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Установка своего аватара на Табуне!
// @author       ???
// @match        https://tabun.everypony.ru/*
// @grant        none
// @license MIT
// ==/UserScript==
// Я не умею писать скрипты, поэтому "TabunAva" являет собой вольную переделку НЕ моего "Tabun Swarm" https://greasyfork.org/ru/scripts/400907-tabun-swarm
//IDENTICON: https://avatars.dicebear.com/styles/identicon
const everyponyCdnStorageRegex = /(https?:)?\/\/cdn\.everypony\.ru\/storage\//;
const everyponyCdnStorageLink = '//cdn.everypony.ru/storage/';
let avaDictionary = {};

function getAvatarsDocument() {

    return fetch('https://tabun.everypony.ru/blog/uniblog/203681.html')
        .then((response) => {
        return response.text();
    })
        .then((text) => {
        let domParser = new DOMParser();
        return domParser.parseFromString(text, "text/html");
    });
}

function fillAvatarsDictionary(avaDocument) {
    const commentNodes = avaDocument.querySelectorAll('#comments .comment');

    commentNodes.forEach((commentNode) => {
        const authorNode = commentNode.querySelector('.comment-author');
        const username = authorNode && authorNode.textContent.trim();
        if (!username) return;

        const contentNode = commentNode.querySelector('.comment-content');
        const imageNode = contentNode && contentNode.querySelector('.text > img');

        if (imageNode && imageNode.hasAttribute('src')) {
            avaDictionary[username] = imageNode
                .getAttribute('src')
                .replace(everyponyCdnStorageRegex, ''); // Сокращаем количество сохраняемых символов
        }
    });
}

// Сохранить список аватаров в локальное хранилище браузера
function saveAvatarsDictionary() {
    const jsonString = JSON.stringify(avaDictionary);
    localStorage.setItem('TabunAvaReborn_Avatars', jsonString);
    localStorage.setItem('TabunAvaReborn_LastUpdate', Date.now().toString());
}

function refreshAvatarsStorage() {
    return getAvatarsDocument()
        .then((avaDocument) => {
        fillAvatarsDictionary(avaDocument);
        saveAvatarsDictionary();
    });
}

function shouldUpdateAvatarsStorage() {
    const lastUpdate = +(localStorage.getItem('TabunAvaReborn_LastUpdate') || '0');
    return (Date.now() - lastUpdate) > 1000 * 60 * 10; // прошло больше 10 минут с последнего обновления
}

// Достать список аватаров из локального хранилища браузера или обновить из поста
function loadAvatarsDictionary() {
    if (shouldUpdateAvatarsStorage()) {
        return refreshAvatarsStorage();
    } else {
        const jsonString = localStorage.getItem('TabunAvaReborn_Avatars');
        if (jsonString) {
            try {
                avaDictionary = JSON.parse(jsonString);
                return Promise.resolve();
            } catch(e) {
                return refreshAvatarsStorage();
            }
        }
    }
}

function isDefaultAvatar(link) {
    return /(\/local\/avatar_male_)/.test(link) || /(\/local\/avatar_female)/.test(link);
}

function getIdenticonAvatar(username) {
    return `https://avatars.dicebear.com/api/identicon/${username}.svg?scale=100&size=48`;
}

function getNewTabunAvatar(username) {
    if (avaDictionary[username]) {
        return everyponyCdnStorageLink + avaDictionary[username];
    }
    return false;
}

function replaceAvatarInImageNode(imageNode, username) {
    if (getNewTabunAvatar(username)) {
        imageNode.setAttribute('src', getNewTabunAvatar(username));
    } else if (
        !imageNode.getAttribute('src')
        || isDefaultAvatar(imageNode.getAttribute('src'))
    ) {
        imageNode.setAttribute('src', getIdenticonAvatar(username));
    }
}

// Замена собственного аватара пользователя в шапке страницы
function replaceHeaderAvatar() {
    const imageNode = document.querySelector('#dropdown-user img');
    if (!imageNode) return;

    const usernameNode = document.querySelector("#dropdown-user .username");
    const username = usernameNode && usernameNode.textContent.trim();
    if (!username) return;

    replaceAvatarInImageNode(imageNode, username);
}

// Замена аватара пользователя в профиле
function replaceProfileAvatar() {
    const imageNode = document.querySelector('.profile-info-about img');
    if (!imageNode) return;

    const usernameNode = document.querySelector(".profile [itemprop=nickname]");
    const username = usernameNode && usernameNode.textContent.trim();
    if (!username) return;

    replaceAvatarInImageNode(imageNode, username);
}

// Замена аватара друзей в профиле
function replaceProfileFriendAvatars() {
    const userNodes = document.querySelectorAll('.user-list-avatar > *');
    userNodes.forEach((userNode) => {
        const imageNode = userNode.querySelector('img');
        if (!imageNode) return;

        const username = userNode.textContent.trim();
        if (!username) return;

        imageNode.width = 48;
        imageNode.height = 48;

        replaceAvatarInImageNode(imageNode, username);
    });
}

// Замена аватара автора поста
function replaceTopicAuthorAvatars() {
    const topicNodes = document.querySelectorAll('.topic');
    topicNodes.forEach((topicNode) => {
        const imageNode = topicNode.querySelector('.avatar');
        if (!imageNode) return;

        const usernameNode = document.querySelector("[rel=author]");
        const username = usernameNode && usernameNode.textContent.trim();
        if (!username) return;

        replaceAvatarInImageNode(imageNode, username);
    });
}

// Замена аватаров в комментариях
function replaceCommentAvatars() {
    const commentNodes = document.querySelectorAll('#comments .comment');
    commentNodes.forEach((commentNode) => {
        const authorNode = commentNode.querySelector('.comment-author');
        const username = authorNode && authorNode.textContent.trim();
        if (!username) return;

        const imageNode = authorNode && authorNode.querySelector('img');
        if (!imageNode) return;

        replaceAvatarInImageNode(imageNode, username);
    });
}

// Замена аватаров в ленте активности
function replaceStreamAvatars() {
    const streamNodes = document.querySelectorAll('.stream-item');
    streamNodes.forEach((streamNode) => {
        const authorNode = streamNode.querySelector('.info a');
        const username = authorNode && authorNode.textContent.trim();
        if (!username) return;

        const imageNode = streamNode.querySelector('img');
        if (!imageNode) return;

        replaceAvatarInImageNode(imageNode, username);
    });
}

// Замена аватаров в разделе "Брони"
function replacePeopleAvatars() {
    const userNodes = document.querySelectorAll('.table-users .cell-name');
    userNodes.forEach((userNode) => {
        const authorNode = userNode.querySelector('.username');
        const username = authorNode && authorNode.textContent.trim();
        if (!username) return;

        const imageNode = userNode.querySelector('img');
        if (!imageNode) return;

        imageNode.width = 48;
        imageNode.height = 48;

        replaceAvatarInImageNode(imageNode, username);
    });
}

// Замена аватаров в блоке "Пожертвования"
function replaceDonationAvatars() {
    const userNodes = document.querySelectorAll('.donation-list > *');
    userNodes.forEach((userNode) => {
        const username = userNode.textContent.trim();
        if (!username) return;

        const imageNode = userNode.querySelector('img');
        if (!imageNode) return;

        imageNode.width = 24;
        imageNode.height = 24;

        replaceAvatarInImageNode(imageNode, username);
    });
}

function replaceAvatarsOnCommentsRefresh() {
    const countCommentsNode = document.querySelector('#count-comments');
    if (!countCommentsNode) return;

    countCommentsNode.addEventListener('DOMSubtreeModified', () => {
        replaceCommentAvatars();
    });
}


loadAvatarsDictionary()
    .then(() => {
    replaceAvatarsOnCommentsRefresh();

    replaceHeaderAvatar();
    replaceCommentAvatars();
    replaceTopicAuthorAvatars();
    replaceProfileAvatar();
    replaceProfileFriendAvatars();
    replaceStreamAvatars();
    replacePeopleAvatars();
    replaceDonationAvatars();
});
